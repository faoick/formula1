import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DataTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PointLight, Points, PointsMaterial, Quaternion, RGBAFormat, Vector3 } from 'three';
import { useEngineStore } from '../../stores/engineStore';
import type { PartSelectionController } from './PartSelectionController';
import { WorkingCycleController, pistonPosition } from './WorkingCycleController';
import { combustionCycle } from './combustionCycle';
import type { Part } from '../../types';

export const combustionTelemetry={active:false,stroke:2,angle:0,spark:0,injection:0};
const convert=(v:number[])=>new Vector3(v[0],v[2],-v[1]);
const gasVertex=`varying vec3 vLocal; varying vec3 vN; varying vec3 vV;
void main(){vLocal=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const gasFragment=`uniform vec3 uColor;uniform float uOpacity;uniform float uAngle;varying vec3 vLocal;varying vec3 vN;varying vec3 vV;
void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.7);
float wave=.76+.24*sin(vLocal.y*13.+sin(vLocal.x*91.+uAngle*2.)+vLocal.z*83.-uAngle*5.);
float ends=1.-smoothstep(.3,.5,abs(vLocal.y));
gl_FragColor=vec4(uColor,(.25+.75*rim)*wave*ends*uOpacity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function sprite() {
  const n=32,pixels=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*4,r=Math.hypot((x+.5)/n-.5,(y+.5)/n-.5)*2;
    pixels.set([255,255,255,Math.round(Math.max(0,1-r)**2*255)],i);
  }
  const tex=new DataTexture(pixels,n,n,RGBAFormat);tex.needsUpdate=true;return tex;
}
function CylinderProcess({part,registry,cycle,first}:{part:Part;registry:PartSelectionController;cycle:WorkingCycleController;first:boolean}) {
  const group=useRef<Group>(null),gas=useRef<Mesh>(null),sleeve=useRef<Mesh>(null),spark=useRef<Mesh>(null),spray=useRef<Points>(null),light=useRef<PointLight>(null);
  const geometry=useMemo(()=>{
    const root=convert(part.axis_origin!),axis=convert(part.axis_direction!),pin=convert(part.crankpin_center!).sub(root);
    return {root,axis,theta:Math.atan2(-pin.z,pin.y),tdc:Math.atan2(-axis.z,axis.y),rotation:new Quaternion().setFromUnitVectors(new Vector3(0,1,0),axis)};
  },[part]);
  const positions=useMemo(()=>new Float32Array(48*3),[]);
  const particleMap=useMemo(sprite,[]);
  const uniforms=useMemo(()=>({uColor:{value:new Color('#77bce6')},uOpacity:{value:.2},uAngle:{value:0}}),[]);
  const color=useMemo(()=>new Color(),[]);
  useEffect(()=>()=>particleMap.dispose(),[particleMap]);
  useFrame(()=>{
    if(!group.current||!gas.current||!sleeve.current||!spark.current||!spray.current)return;
    const s=useEngineStore.getState();
    const story=s.mode==='story'&&s.stage==='story'&&s.progress>=.248&&s.progress<.3;
    const visible=s.combustion&&cycle.running&&!s.reducedMotion&&(story?first:s.mode==='lab'&&s.playing&&(s.quality!=='low'||first));
    group.current.visible=visible;
    if(first)combustionTelemetry.active=visible;
    if(!visible)return;
    const {root,axis,theta,tdc,rotation}=geometry;
    const phase=combustionCycle(cycle.angle,theta,tdc,part.cylinder_index!);
    const t=pistonPosition(theta+cycle.angle,axis).piston.dot(axis);
    const bottom=t+.0202,ceiling=.163,height=Math.max(.0015,ceiling-bottom);
    const owner=registry.entries.get(part.id)!.object.parent!;
    group.current.position.copy(root).applyMatrix4(owner.matrixWorld);
    group.current.quaternion.copy(rotation);
    gas.current.position.y=(bottom+ceiling)/2;gas.current.scale.set(.039,height,.039);
    sleeve.current.position.y=.119;sleeve.current.scale.y=.088;
    uniforms.uAngle.value=phase.angle;
    const hot=Math.min(1,phase.burn+phase.spark);
    color.set(phase.stroke===1?'#80919d':'#69b5dc').lerp(new Color('#ffad46'),hot);
    uniforms.uColor.value.copy(color);uniforms.uOpacity.value=.12+phase.injection*.13+hot*.72;
    spark.current.position.y=ceiling-.002;
    spark.current.scale.setScalar(.001+phase.spark*.006);
    (spark.current.material as MeshBasicMaterial).opacity=phase.spark*.9;
    const mat=spray.current.material as PointsMaterial;
    mat.opacity=phase.injection*.75;mat.size=.0016;
    for(let i=0;i<48;i++){
      const travel=(phase.local*2.5+i/48)%1,angle=(i%6)/6*Math.PI*2;
      const r=travel*.027,drop=travel*Math.min(.063,height*.94);
      positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=ceiling-.004-drop;positions[i*3+2]=Math.sin(angle)*r;
    }
    spray.current.geometry.attributes.position.needsUpdate=true;
    if(light.current){light.current.position.y=ceiling-.012;light.current.intensity=.018*phase.spark+.009*phase.burn;}
    if(first){combustionTelemetry.stroke=phase.stroke;combustionTelemetry.angle=phase.angle;combustionTelemetry.spark=phase.spark;combustionTelemetry.injection=phase.injection;}
    if(import.meta.env.DEV&&first)(window as unknown as {__combustion:unknown}).__combustion={...combustionTelemetry};
  });
  return <group ref={group} visible={false}>
    <mesh ref={sleeve} raycast={()=>null}>
      <cylinderGeometry args={[.0407,.0407,1,64,1,true,.38,Math.PI*1.42]}/>
      <meshPhysicalMaterial color="#9ab0c3" roughness={.23} metalness={.35} transparent opacity={.09} side={DoubleSide} depthWrite={false}/>
    </mesh>
    <mesh ref={gas} raycast={()=>null}>
      <cylinderGeometry args={[1,1,1,48,8,true]}/>
      <shaderMaterial uniforms={uniforms} vertexShader={gasVertex} fragmentShader={gasFragment} transparent depthWrite={false} side={DoubleSide} blending={AdditiveBlending}/>
    </mesh>
    <mesh ref={spark} raycast={()=>null}>
      <sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#fff0c8" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false}/>
    </mesh>
    <points ref={spray} frustumCulled={false} raycast={()=>null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry>
      <pointsMaterial map={particleMap} color="#d6edff" size={.0016} transparent opacity={0} depthWrite={false} blending={AdditiveBlending}/>
    </points>
    {first&&<pointLight ref={light} color="#ffbb70" distance={.24} decay={2} intensity={0}/>}
  </group>;
}
export function CombustionEffects({registry,cycle}:{registry:PartSelectionController;cycle:WorkingCycleController}) {
  const pistons=useMemo(()=>[...registry.entries.values()].map(e=>e.part).filter(p=>p.component_kind==='piston'),[registry]);
  return <group name="Educational combustion overlay">{pistons.map((p,i)=><CylinderProcess key={p.id} part={p} first={i===0} registry={registry} cycle={cycle}/>)}</group>;
}
export function CombustionReadout() {
  const [state,setState]=useState({...combustionTelemetry});
  useEffect(()=>{const timer=setInterval(()=>setState({...combustionTelemetry}),120);return()=>clearInterval(timer);},[]);
  return <div className={'combustion-readout '+(state.active?'active':'')}>
    <div className="combustion-strokes">{['Впуск','Сжатие','Искра / ход','Выпуск'].map((name,i)=><span key={name} className={state.active&&[2,3,0,1][i]===state.stroke?'current':''}>{name}</span>)}</div>
    <small>{state.active?'Учебный разрез · 720° за цикл':'Прокрутите дальше: впрыск, искра и рабочий ход'}</small>
  </div>;
}
