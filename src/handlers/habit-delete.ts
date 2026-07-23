import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^habit:delete:(.+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const habitId = match[1];
  const habit = store.getHabitById(ctx.chat.id, habitId);

  if (!habit) {
    await ctx.reply("That habit wasn't found.");
    return;
  }

  await ctx.reply(
    `Delete "${habit.name}"?\n\nThis can't be undone — all your streak data for this habit will be lost.`,
    { reply_markup: confirmKeyboard(`habit:confirmdelete:${habitId}`, { yes: "🗑️ Yes, delete", no: "⬅️ Keep it" }) },
  );
});

composer.callbackQuery(/^habit:confirmdelete:(.+):yes$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const habitId = match[1];
  const habit = store.getHabitById(ctx.chat.id, habitId);
  const name = habit?.name ?? "the habit";
  store.deleteHabit(ctx.chat.id, habitId);
  await ctx.reply(`"${name}" has been deleted.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^habit:confirmdelete:(.+):no$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  await ctx.reply("Kept it! No changes made.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
