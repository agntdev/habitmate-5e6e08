import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

registerMainMenuItem({ label: "➕ New habit", data: "habit:create", order: 10 });
registerMainMenuItem({ label: "📋 My habits", data: "habits:list", order: 20 });

const WELCOME = "👋 Welcome to HabitNest — your private habit tracker.\n\nTap a button below to get started.";

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  const existing = store.getUser(chatId);

  if (!existing) {
    const tz = ctx.from?.language_code
      ? mapTelegramTz(ctx.from.language_code)
      : "UTC";
    store.saveUser(chatId, {
      telegramId: chatId,
      displayName: ctx.from?.first_name ?? "there",
      timezone: tz,
      recapDay: "sunday",
      recapTime: "18:00",
    });
  }

  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;

function mapTelegramTz(langCode: string): string {
  const tzMap: Record<string, string> = {
    en: "UTC",
    "en-us": "America/New_York",
    "en-gb": "Europe/London",
    es: "Europe/Madrid",
    fr: "Europe/Paris",
    de: "Europe/Berlin",
    it: "Europe/Rome",
    pt: "Europe/Lisbon",
    ru: "Europe/Moscow",
    ja: "Asia/Tokyo",
    "zh-cn": "Asia/Shanghai",
    ko: "Asia/Seoul",
    ar: "Asia/Riyadh",
    hi: "Asia/Kolkata",
  };
  return tzMap[langCode.toLowerCase()] ?? "UTC";
}
