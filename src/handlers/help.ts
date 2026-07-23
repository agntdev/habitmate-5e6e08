import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "ℹ️ HabitNest helps you build good habits with gentle reminders.\n\n" +
  "• Tap ➕ New habit to create a habit\n" +
  "• Tap 📋 My habits to see your progress\n" +
  "• Tap 📊 Weekly recap to review your week\n" +
  "• Tap ⚙️ Settings to change your timezone or recap time\n\n" +
  "Everything is reachable by tapping — no commands needed!";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
