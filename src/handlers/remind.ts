import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

const composer = new Composer<Ctx>();

composer.command("remind", async (ctx) => {
  if (!ctx.chat) return;
  const chatId = ctx.chat.id;
  const habits = store.getHabits(chatId);
  const today = getCurrentDate(chatId);

  if (habits.length === 0) {
    await ctx.reply("You don't have any habits set up yet.\n\nTap /start to create your first habit.", {
      reply_markup: inlineKeyboard([[inlineButton("➕ New habit", "habit:create")]]),
    });
    return;
  }

  const pending = habits.filter((h) => {
    const inst = store.getInstance(chatId, h.id, today);
    return !inst || inst.status === "pending" || inst.status === "snoozed";
  });

  if (pending.length === 0) {
    await ctx.reply("You're all caught up for today! Great job. 🎉", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  for (const h of pending) {
    const inst = store.getInstance(chatId, h.id, today);
    const isSnoozed = inst?.status === "snoozed";
    const msg = isSnoozed
      ? `Snoozed reminder for "${h.name}":`
      : `Time for "${h.name}"!`;
    await ctx.reply(msg, {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Done", `habit:checkin:done:${h.id}`),
          inlineButton("⏭️ Skip", `habit:checkin:skip:${h.id}`),
          inlineButton("😴 Snooze", `habit:checkin:snooze:${h.id}`),
        ],
      ]),
    });
  }
});

composer.callbackQuery("remind:trigger", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat.id;
  const habits = store.getHabits(chatId);
  const today = getCurrentDate(chatId);

  if (habits.length === 0) {
    await ctx.reply("No habits to remind you about yet.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const pending = habits.filter((h) => {
    const inst = store.getInstance(chatId, h.id, today);
    return !inst || inst.status === "pending" || inst.status === "snoozed";
  });

  if (pending.length === 0) {
    await ctx.reply("All done for today! 🎉", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  for (const h of pending) {
    await ctx.reply(`Time for "${h.name}"!`, {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Done", `habit:checkin:done:${h.id}`),
          inlineButton("⏭️ Skip", `habit:checkin:skip:${h.id}`),
          inlineButton("😴 Snooze", `habit:checkin:snooze:${h.id}`),
        ],
      ]),
    });
  }
});

function getCurrentDate(chatId: number): string {
  const user = store.getUser(chatId);
  const tz = user?.timezone ?? "UTC";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default composer;
