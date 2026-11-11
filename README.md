# VolMatch Kazakhstan

VolMatch — добрые дела рядом. Статический образовательный прототип платформы для поиска волонтёрских возможностей в Казахстане.

**Демо:** https://volmatch-kazakhstan.netlify.app

## Структура

```
netlify.toml        # конфигурация Netlify (publish = "public", без сборки)
public/index.html   # приложение (одна страница)
```

> Страница подключает файлы из `public/volmatch-assets/` (Leaflet, `volmatch-api.js`, `volmatch-ui.js`, `volmatch-staff.js`, `volmatch-enhancements.*`). Добавьте эту папку в репозиторий, чтобы проект работал локально.

## Запуск локально

```bash
npx serve public
```

## Деплой

Netlify подхватывает `netlify.toml` автоматически: сборка не требуется, публикуется папка `public`.
