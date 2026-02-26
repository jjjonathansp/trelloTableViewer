<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/052225e3-17b5-4a4e-b562-341b4527e181

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Use as Trello Power-Up

1. Start the app locally or deploy it (`npm run dev` for local testing).
2. In Trello, open your Power-Ups admin and create/edit a custom Power-Up.
3. Set the **Iframe Connector URL** to:
   `http://localhost:3000/power-up.js`
   (or your deployed domain + `/power-up.js`).
4. Add the Power-Up to a board.
5. Open any control card: the Power-Up shows a table in the card back section with all linked cards found in the control card description/checklists.
6. Add notes per linked card directly in that table.
