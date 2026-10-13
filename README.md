# 🏎️ FORMULA 1 — INSIDE THE MACHINE

<p align="center">
  <b>Интерактивная 3D-экскурсия и инженерная лаборатория гибридного двигателя Формулы-1 (V6 Turbo Hybrid)</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-r186-black?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/R3F-Fiber_9.8-black?style=for-the-badge" alt="React Three Fiber" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
</p>

---

## 📖 О проекте

**Inside the Machine** — интерактивное веб-приложение для детального изучения устройства и кинематики современного гибридного силового агрегата Formula 1 (на основе модели **VANTA R26**). 

Оптимизированная веб-модель содержит **1 267 деталей** и **35 сборок**, включая блоки цилиндров, коленчатый вал, поршневую группу, турбокомпрессор с MGU-H, рекуператор MGU-K и корпус коробки передач.

---

## ✨ Ключевые возможности

- 🎬 **Интерактивный скроллинг-тур**: 10 глав повествования с плавными переходами камеры по 19 кинематографическим ракурсам. При обратной прокрутке все узлы возвращаются на место.
- 🔬 **3D-лаборатория (Инспектор)**:
  - Свободное вращение (OrbitControls), зум, панорамирование и поддержка тач-жестов на мобильных устройствах.
  - Клик по любой детали открывает паспорт узла с техническим описанием и ID (например, `INT-0007`).
  - Поиск по названию деталей на русском и английском языках.
- 💥 **Взрыв-схема (Exploded View)**: пошаговый слайдер разборки двигателя — снятие внешних узлов, открытие головок блока, извлечение поршней по осям цилиндров и опускание коленвала.
- ⚙️ **Рабочий цикл (Кинематика)**: визуализация синхронного движения 6 поршней, шатунов и коленчатого вала в реальном времени.
- 🩻 **Режимы визуализации**: рентген (X-Ray), скрытие корпусов, изоляция выбранной системы, анимация потоков жидкостей/газов и полноэкранный режим презентации.
- 🔗 **Deep Linking**: возможность поделиться ссылкой с точным положением камеры, выбранной деталью и степенью разборки.

---

## 🚀 Быстрый старт

### Требования
- **Node.js**: `22.12+` (рекомендуется 22 LTS или 24)
- **npm** или **pnpm / yarn**

### Установка и запуск в режиме разработки

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/faoick/formula1.git
   cd formula1
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Запустите локальный сервер разработки:**
   ```bash
   npm run dev
   ```
   Откройте [http://localhost:5178](http://localhost:5178) в браузере.

---

### Сборка для продакшена

```bash
# Сборка оптимизированного бандла
npm run build

# Локальный предпросмотр сборки
npm run preview
```

---

## 🎮 Управление в 3D-сцене

| Действие | Мышь / Клавиатура | Сенсорный экран |
| :--- | :--- | :--- |
| **Вращение** | Зажать <kbd>ЛКМ</kbd> + движение | Свайп одним пальцем |
| **Панорамирование** | Зажать <kbd>ПКМ</kbd> или <kbd>Shift</kbd> + <kbd>ЛКМ</kbd> | Свайп двумя пальцами |
| **Приближение/отдаление** | Колесо мыши (<kbd>Scroll</kbd>) | Жест щипка (Pinch-to-zoom) |
| **Выбор детали** | Клик <kbd>ЛКМ</kbd> по детали | Касание детали |
| **Сброс вида** | Кнопка «Сброс камеры» в UI | Кнопка «Сброс камеры» |

---

## 🛠️ Стек технологий

- **Фронтенд-фреймворк**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **3D-рендеринг**: [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei)
- **Анимации**: [GSAP](https://gsap.com/)
- **Стилизация**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Стейт-менеджмент**: [Zustand 5](https://zustand.docs.pmnd.rs/)
- **Оптимизация 3D-моделей**: [@gltf-transform](https://gltf-transform.dev/) + Meshoptimizer
- **Сборщик**: [Vite 8](https://vitejs.dev/)

---

## 📦 Пайплайн 3D-модели (Blender → WebGL)

В проект уже включена готовая оптимизированная модель `public/models/engine.glb` (подгрузка из сети не требуется).

При необходимости обновить исходный Blender-файл:

```powershell
# Экспорт геометрии из Blender в GLTF/GLB
& 'path/to/blender.exe' --background 'Formula1_Engineering.blend' --python-exit-code 1 --python './scripts/blender_export/export_engine.py' -- --output './public'

# Оптимизация сетки, сжатие текстур и валидация
npm run optimize:model
npm run validate:model
npm run build
```

---

## 🧪 Тестирование и контроль качества

```bash
# Модульные тесты логики и состояния
npm test

# Валидация метаданных и структуры 3D-сцены
npm run validate:model

# Браузерные E2E-проверки через Playwright (требуется запущенный dev-сервер)
node scripts/browser-qa.mjs
```

---

## 📂 Структура проекта

```
F1_ENGINE_EXPERIENCE/
├── public/               # Статические ресурсы, документация и сжатая модель engine.glb
│   ├── documentation/    # Технические спецификации и лимиты
│   └── models/           # Сжатый бинарный файл сцены GLB
├── scripts/              # Скрипты экспорта Blender, валидации и оптимизации моделей
├── src/
│   ├── components/       # UI-компоненты (инспектор, плеер, слайдеры разборки, меню)
│   ├── scenes/           # Three.js сцена (EngineScene, освещение, камеры, шейдеры)
│   ├── stores/           # Zustand store (состояние камеры, выборки, анимации)
│   ├── data/             # Сценарии глав, переводы и тексты образовательных тем
│   └── types/            # TypeScript типы и интерфейсы
├── tests/                # Набор модульных и интеграционных тестов
└── docs/                 # Архитектурная документация, ревизия R2 и аудит QA
```

---

## ⚠️ Отказ от ответственности

Данный проект носит исключительно **образовательный и демонстрационный характер** и не аффилирован с Formula One World Championship Limited или командами чемпионата. Модель двигателя представляет собой независимую авторскую реконструкцию.
