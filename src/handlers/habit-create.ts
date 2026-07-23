import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:create", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_habit_name";
  ctx.session.creatingHabit = {};
  await ctx.reply("What habit would you like to build?\n\nType the name below — something short like \"Meditate\" or \"Read 20 pages\".", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Cancel", "menu:main")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (!ctx.chat) return next();
  if (ctx.session.step !== "awaiting_habit_name") return next();
  const name = ctx.message.text.trim();
  if (name.length < 2 || name.length > 50) {
    await ctx.reply("Keep it between 2–50 characters. Try again.");
    return;
  }
  ctx.session.creatingHabit = { name };
  ctx.session.step = "awaiting_schedule_type";
  await ctx.reply(`Great — "${name}"! How often?`, {
    reply_markup: inlineKeyboard([
      [
        inlineButton("📅 Daily", "habit:schedule:daily"),
        inlineButton("📆 Weekly", "habit:schedule:weekly"),
      ],
      [inlineButton("⬅️ Cancel", "menu:main")],
    ]),
  });
});

composer.callbackQuery(/^habit:schedule:(.+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const scheduleType = match[1];
  if (!ctx.session.creatingHabit) return;
  ctx.session.creatingHabit.scheduleType = scheduleType;
  ctx.session.step = "awaiting_scheduled_time";
  await ctx.reply("What time should I remind you?\n\nType it like 7:00 AM or 9:30 PM.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Cancel", "menu:main")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (!ctx.chat) return next();
  if (ctx.session.step !== "awaiting_scheduled_time") return next();
  const timeStr = ctx.message.text.trim();
  const parsed = parseTimeInput(timeStr);
  if (!parsed) {
    await ctx.reply("I couldn't understand that time. Try something like \"7:00 AM\" or \"9:30 PM\".");
    return;
  }
  if (!ctx.session.creatingHabit) return;
  ctx.session.creatingHabit.scheduledTime = parsed;
  ctx.session.step = "confirming_habit";
  const h = ctx.session.creatingHabit;
  const user = store.getUser(ctx.chat.id);
  await ctx.reply(
    `Ready to create your habit:\n\n` +
    `📝 ${h.name}\n` +
    `🔁 ${h.scheduleType}\n` +
    `⏰ ${parsed}\n` +
    `🌍 ${user?.timezone ?? "UTC"}`,
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Create", "habit:confirm"),
          inlineButton("⬅️ Cancel", "menu:main"),
        ],
      ]),
    },
  );
});

composer.callbackQuery("habit:confirm", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  if (!ctx.session.creatingHabit) return;
  const h = ctx.session.creatingHabit;
  const user = store.getUser(ctx.chat.id);
  store.createHabit(ctx.chat.id, {
    name: h.name!,
    scheduleType: h.scheduleType!,
    scheduledTime: h.scheduledTime!,
    timezone: user?.timezone ?? "UTC",
  });
  ctx.session.step = undefined;
  ctx.session.creatingHabit = undefined;
  await ctx.reply("Your habit is set up! You'll get gentle reminders at the scheduled time. Tap ✅ when you complete it, ⏭️ to skip, or 😴 to snooze.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

function parseTimeInput(input: string): string | null {
  const cleaned = input.trim().toLowerCase();
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(cleaned);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2];
  const period = m[3];
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  if (!period && (hours < 1 || hours > 23)) return null;
  if (hours < 0 || hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export default composer;
