import { MemorySessionStorage } from "./toolkit/session/memory.js";
import type { StorageAdapter } from "grammy";

export interface UserProfile {
  telegramId: number;
  displayName: string;
  timezone: string;
  recapDay: string;
  recapTime: string;
}

export interface Habit {
  id: string;
  userId: number;
  name: string;
  scheduleType: string;
  scheduledTime: string;
  timezone: string;
  activeStatus: boolean;
  milestoneSettings: number[];
}

export interface HabitInstance {
  id: string;
  habitId: string;
  userId: number;
  date: string;
  status: "done" | "skip" | "snoozed" | "pending";
  timestamp: string;
}

export interface HabitMetrics {
  habitId: string;
  userId: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

interface UserData {
  user?: UserProfile;
  habits: Record<string, Habit>;
  instances: Record<string, HabitInstance>;
  metrics: Record<string, HabitMetrics>;
  habitCounter: number;
}

const userStore = new Map<number, UserData>();
let globalHabitCounter = 0;

function getUserData(chatId: number): UserData {
  let data = userStore.get(chatId);
  if (!data) {
    data = { habits: {}, instances: {}, metrics: {}, habitCounter: 0 };
    userStore.set(chatId, data);
  }
  return data;
}

export const store = {
  getUser(chatId: number): UserProfile | undefined {
    return getUserData(chatId).user;
  },

  saveUser(chatId: number, profile: UserProfile): void {
    const data = getUserData(chatId);
    data.user = profile;
  },

  deleteUser(chatId: number): void {
    userStore.delete(chatId);
  },

  createHabit(chatId: number, input: Omit<Habit, "id" | "userId" | "activeStatus" | "milestoneSettings">): Habit {
    const data = getUserData(chatId);
    data.habitCounter++;
    const id = `h_${chatId}_${data.habitCounter}`;
    const habit: Habit = {
      ...input,
      id,
      userId: chatId,
      activeStatus: true,
      milestoneSettings: [7, 30, 90],
    };
    data.habits[id] = habit;
    data.metrics[id] = {
      habitId: id,
      userId: chatId,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
    };
    return habit;
  },

  getHabits(chatId: number): Habit[] {
    const data = getUserData(chatId);
    return Object.values(data.habits).filter((h) => h.activeStatus);
  },

  getHabitById(chatId: number, habitId: string): Habit | undefined {
    return getUserData(chatId).habits[habitId];
  },

  updateHabit(chatId: number, habitId: string, updates: Partial<Habit>): void {
    const data = getUserData(chatId);
    if (data.habits[habitId]) {
      data.habits[habitId] = { ...data.habits[habitId], ...updates };
    }
  },

  deleteHabit(chatId: number, habitId: string): void {
    const data = getUserData(chatId);
    delete data.habits[habitId];
    delete data.instances[habitId];
    delete data.metrics[habitId];
  },

  saveInstance(chatId: number, instance: HabitInstance): void {
    const data = getUserData(chatId);
    const key = `${instance.habitId}_${instance.date}`;
    data.instances[key] = instance;
  },

  getInstance(chatId: number, habitId: string, date: string): HabitInstance | undefined {
    const data = getUserData(chatId);
    return data.instances[`${habitId}_${date}`];
  },

  getMetrics(chatId: number, habitId: string): HabitMetrics | undefined {
    return getUserData(chatId).metrics[habitId];
  },

  updateMetrics(chatId: number, habitId: string, updates: Partial<HabitMetrics>): void {
    const data = getUserData(chatId);
    if (data.metrics[habitId]) {
      data.metrics[habitId] = { ...data.metrics[habitId], ...updates };
    }
  },

  getAllUsers(): UserProfile[] {
    const users: UserProfile[] = [];
    for (const data of userStore.values()) {
      if (data.user) users.push(data.user);
    }
    return users;
  },

  _reset(): void {
    userStore.clear();
  },
};
