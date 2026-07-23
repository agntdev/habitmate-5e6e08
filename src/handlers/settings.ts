import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { store } from "../data-store.js";

registerMainMenuItem({ label: "⚙️ Settings", data: "settings:show", order: 40 });

const composer = new Composer<Ctx>();

composer.callbackQuery("settings:show", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const user = store.getUser(ctx.chat.id);
  if (!user) {
    await ctx.reply("Please tap /start first to set up your profile.");
    return;
  }

  await ctx.reply(
    `Your settings:\n\n` +
    `🌍 Timezone: ${user.timezone}\n` +
    `📅 Weekly recap: ${user.recapDay} at ${user.recapTime}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🌍 Change timezone", "settings:timezone")],
        [inlineButton("📅 Change recap time", "settings:recap")],
        [inlineButton("🗑️ Delete all my data", "settings:deleteall")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("settings:timezone", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  ctx.session.settingTimezone = true;
  await ctx.reply(
    "Type your timezone offset from UTC (e.g. UTC, UTC+5:30, America/New_York).",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("UTC", "settings:settz:UTC")],
        [inlineButton("UTC+1", "settings:settz:Europe/Paris")],
        [inlineButton("UTC+5:30", "settings:settz:Asia/Kolkata")],
        [inlineButton("UTC-5", "settings:settz:America/New_York")],
        [inlineButton("UTC-8", "settings:settz:America/Los_Angeles")],
        [inlineButton("UTC+9", "settings:settz:Asia/Tokyo")],
        [inlineButton("⬅️ Back", "settings:show")],
      ]),
    },
  );
});

composer.callbackQuery(/^settings:settz:(.+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const tz = match[1];
  const user = store.getUser(ctx.chat.id);
  if (user) {
    store.saveUser(ctx.chat.id, { ...user, timezone: tz });
  }
  ctx.session.settingTimezone = false;
  await ctx.reply(`Timezone updated to ${tz}.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (!ctx.chat) return next();
  if (!ctx.session.settingTimezone) return next();
  const tz = ctx.message.text.trim();
  if (tz.length < 2 || tz.length > 50) {
    await ctx.reply("That doesn't look like a valid timezone. Try something like UTC, America/New_York, or Europe/London.");
    return;
  }
  const user = store.getUser(ctx.chat.id);
  if (user) {
    store.saveUser(ctx.chat.id, { ...user, timezone: tz });
  }
  ctx.session.settingTimezone = false;
  await ctx.reply(`Timezone updated to ${tz}.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.callbackQuery("settings:recap", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  ctx.session.settingRecapTime = true;
  await ctx.reply(
    "When should I send your weekly recap?\n\nType the day and time like: Sunday 6pm",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("Sunday 6pm", "settings:setrecap:sunday:18:00")],
        [inlineButton("Friday 5pm", "settings:setrecap:friday:17:00")],
        [inlineButton("⬅️ Back", "settings:show")],
      ]),
    },
  );
});

composer.callbackQuery(/^settings:setrecap:([^:]+):([^:]+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const day = match[1];
  const time = match[2];
  const user = store.getUser(ctx.chat.id);
  if (user) {
    store.saveUser(ctx.chat.id, { ...user, recapDay: day, recapTime: time });
  }
  ctx.session.settingRecapTime = false;
  await ctx.reply(`Weekly recap set for ${day} at ${time}.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (!ctx.chat) return next();
  if (!ctx.session.settingRecapTime) return next();
  const input = ctx.message.text.trim().toLowerCase();
  const m = /^(\w+)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?$/.exec(input);
  if (!m) {
    await ctx.reply("Try a format like \"Sunday 6pm\" or \"Friday 5:30pm\".");
    return;
  }
  const day = m[1];
  let hours = parseInt(m[2], 10);
  const minutes = m[3] ?? "00";
  const period = m[4];
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  const time = `${String(hours).padStart(2, "0")}:${minutes}`;
  const user = store.getUser(ctx.chat.id);
  if (user) {
    store.saveUser(ctx.chat.id, { ...user, recapDay: day, recapTime: time });
  }
  ctx.session.settingRecapTime = false;
  await ctx.reply(`Weekly recap set for ${day} at ${time}.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.callbackQuery("settings:deleteall", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Delete all your data?\n\nThis removes your profile, habits, and all progress. This can't be undone.",
    { reply_markup: inlineKeyboard([
      [inlineButton("🗑️ Yes, delete everything", "settings:confirmdeleteall")],
      [inlineButton("⬅️ Keep my data", "settings:show")],
    ]) },
  );
});

composer.callbackQuery("settings:confirmdeleteall", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  store.deleteUser(ctx.chat.id);
  await ctx.reply("All your data has been deleted. Tap /start if you want to start fresh.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
