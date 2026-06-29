# Boka_plane

Это простая веб-игра, размещённая на GitHub Pages.

## Как посмотреть игру

1. Убедитесь, что репозиторий уже добавлен на GitHub.
2. Отправьте ветку `main` на GitHub.
3. В настройках репозитория откройте `Settings` → `Pages`.
4. Выберите ветку `main` и папку `/root`.
5. GitHub выдаст адрес вида:

```text
https://Stormstomp.github.io/Boka_plane/
```

## Про проект

- `index.html` — стартовая страница игры
- `styles.css` — оформление
- `game.js` — игровой цикл и логика
- `telegram.js` — поддержка Telegram Web App
- `background.jpg`, `face.png`, `beer.svg.svg` — ресурсы игры

## Telegram Web App

Для использования в Telegram Web App нужно взять URL GitHub Pages и указать его в настройках кнопки бота.

## Процесс обновления

1. Вносите изменения в проект.
2. Добавьте изменённые файлы в git:
   ```powershell
git add .
```
3. Сделайте коммит с понятным сообщением:
   ```powershell
git commit -m "Описание изменений"
```
4. Отправьте изменения на GitHub:
   ```powershell
git push origin main
```
5. Обязательно проверьте GitHub Pages после пуша, чтобы убедиться, что обновления применены:
   - откройте `https://Stormstomp.github.io/Boka_plane/`
   - обновите страницу с очисткой кеша: `Ctrl+F5`
   - убедитесь, что изменения видны в HTML/дизайне

> После каждого пуша проверка GitHub Pages обязательна.
