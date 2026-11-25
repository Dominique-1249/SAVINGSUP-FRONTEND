export type User = {
  id: string;
  name: string;
  email: string;
};

export type SavingsEntry = {
  id: number;
  type: "deposit" | "withdrawal";
  amount: string;
  note: string | null;
  date: string;
  created_at: string;
};

export type SavingsSummary = {
  balance: number;
  deposits: number;
  withdrawals: number;
  entries: number;
};

export type SavingsGoal = {
  name: string;
  target_amount: number;
  progress: number;
};

export type DashboardData = {
  summary: SavingsSummary;
  goal: SavingsGoal | null;
};

export type AuthResult = {
  user: User;
  token: string;
};

export type EntryInput = {
  type: "deposit" | "withdrawal";
  amount: string;
  note: string;
  date: string;
};
