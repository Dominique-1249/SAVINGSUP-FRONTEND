import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createEntry,
  deleteEntry,
  getDashboard,
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  saveGoal,
} from "./api";
import type {
  AuthResult,
  DashboardData,
  SavingsEntry,
  User,
} from "./types";

const TOKEN_KEY = "savenest_token";

type FullDashboard = DashboardData & { entries: SavingsEntry[] };

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<FullDashboard | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      setDashboard(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([getMe(token), getDashboard(token)])
      .then(([me, data]) => {
        if (!active) return;
        setUser(me.user);
        setDashboard(data);
        setError("");
      })
      .catch((requestError) => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Session expired. Please log in again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function refresh() {
    if (!token) return;
    const data = await getDashboard(token);
    setDashboard(data);
  }

  function handleAuth(result: AuthResult) {
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setToken(result.token);
    setLoading(true);
    setError("");
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutUser(token);
      } catch {
        // Clear the local session even if the server request fails.
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setDashboard(null);
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loader" />
        <p>Opening your savings...</p>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <AuthScreen
        error={error}
        onAuth={handleAuth}
        onClearError={() => setError("")}
      />
    );
  }

  return (
    <Dashboard
      token={token}
      user={user}
      dashboard={dashboard}
      error={error}
      onError={setError}
      onRefresh={refresh}
      onLogout={handleLogout}
    />
  );
}

function AuthScreen({
  error,
  onAuth,
  onClearError,
}: {
  error: string;
  onAuth: (result: AuthResult) => void;
  onClearError: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    onClearError();

    if (mode === "register" && password !== confirmation) {
      setFormError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const result =
        mode === "login"
          ? await loginUser({ email, password })
          : await registerUser({
              name,
              email,
              password,
              password_confirmation: confirmation,
            });

      onAuth(result);
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in.",
      );
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setFormError("");
    onClearError();
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark">S</div>
        <p className="eyebrow">PERSONAL SAVINGS TRACKER</p>
        <h1>Small savings. Visible progress.</h1>
        <p className="auth-hero-copy">
          Record deposits, track withdrawals and keep one clear goal in sight.
          Simple, private and built for one user at a time.
        </p>
        <div className="auth-points">
          <span>Track every deposit</span>
          <span>See your balance</span>
          <span>Reach your goal</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <h2>{mode === "login" ? "Welcome back" : "Start saving today"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Log in to see your savings."
              : "Create your personal savings account."}
          </p>

          <form onSubmit={handleSubmit} className="stack">
            {mode === "register" && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  minLength={2}
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </label>

            {mode === "register" && (
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={8}
                />
              </label>
            )}

            {(formError || error) && (
              <p className="error-box">{formError || error}</p>
            )}

            <button type="submit" className="primary-button" disabled={busy}>
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  token,
  user,
  dashboard,
  error,
  onError,
  onRefresh,
  onLogout,
}: {
  token: string;
  user: User;
  dashboard: FullDashboard | null;
  error: string;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}) {
  const [goalOpen, setGoalOpen] = useState(false);
  const balance = dashboard?.summary.balance ?? 0;
  const goal = dashboard?.goal;

  if (!dashboard) {
    return (
      <div className="center-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-mark small">S</div>
          <div>
            <strong>SaveNest</strong>
            <span>Personal savings</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="user-name">{user.name}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard">
        {error && <p className="error-box">{error}</p>}

        <section className="top-grid">
          <div className="balance-card">
            <p className="eyebrow">CURRENT BALANCE</p>
            <h1>{money.format(balance)}</h1>
            <div className="balance-stats">
              <span>
                <small>Deposits</small>
                <strong>{money.format(dashboard.summary.deposits)}</strong>
              </span>
              <span>
                <small>Withdrawals</small>
                <strong>{money.format(dashboard.summary.withdrawals)}</strong>
              </span>
              <span>
                <small>Entries</small>
                <strong>{dashboard.summary.entries}</strong>
              </span>
            </div>
          </div>

          <div className="goal-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">SAVINGS GOAL</p>
                <h2>{goal?.name ?? "Set your first goal"}</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setGoalOpen((value) => !value)}
              >
                {goalOpen ? "Close" : goal ? "Edit" : "Set goal"}
              </button>
            </div>

            {goal ? (
              <>
                <div className="goal-numbers">
                  <strong>{goal.progress}%</strong>
                  <span>
                    {money.format(balance)} of{" "}
                    {money.format(goal.target_amount)}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="muted">
                Give your savings a target so every deposit has a purpose.
              </p>
            )}

            {goalOpen && (
              <GoalForm
                token={token}
                goal={goal ?? null}
                onError={onError}
                onSaved={async () => {
                  await onRefresh();
                  setGoalOpen(false);
                }}
              />
            )}
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <div className="card-heading">
              <div>
                <p className="eyebrow">NEW ENTRY</p>
                <h2>Add money movement</h2>
              </div>
            </div>
            <EntryForm
              token={token}
              onError={onError}
              onSaved={onRefresh}
            />
          </div>

          <div className="panel history-panel">
            <div className="card-heading">
              <div>
                <p className="eyebrow">HISTORY</p>
                <h2>Recent activity</h2>
              </div>
              <span className="count-pill">{dashboard.entries.length}</span>
            </div>
            <History
              token={token}
              entries={dashboard.entries}
              onError={onError}
              onChanged={onRefresh}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function EntryForm({
  token,
  onError,
  onSaved,
}: {
  token: string;
  onError: (message: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    setBusy(true);

    try {
      await createEntry(token, { type, amount, note, date });
      setAmount("");
      setNote("");
      await onSaved();
    } catch (requestError) {
      onError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the entry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="type-toggle">
        <button
          type="button"
          className={type === "deposit" ? "active deposit" : ""}
          onClick={() => setType("deposit")}
        >
          Deposit
        </button>
        <button
          type="button"
          className={type === "withdrawal" ? "active withdrawal" : ""}
          onClick={() => setType("withdrawal")}
        >
          Withdrawal
        </button>
      </div>

      <label>
        Amount (PHP)
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="500.00"
          required
        />
      </label>

      <label>
        Note
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Allowance, payout, etc."
          maxLength={255}
        />
      </label>

      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </label>

      <button type="submit" className="primary-button" disabled={busy}>
        {busy
          ? "Saving..."
          : type === "deposit"
            ? "Add deposit"
            : "Record withdrawal"}
      </button>
    </form>
  );
}

function GoalForm({
  token,
  goal,
  onError,
  onSaved,
}: {
  token: string;
  goal: DashboardData["goal"];
  onError: (message: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(
    goal ? String(goal.target_amount) : "",
  );
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    setBusy(true);

    try {
      await saveGoal(token, { name, target_amount: target });
      await onSaved();
    } catch (requestError) {
      onError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the goal.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack goal-form">
      <label>
        Goal name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Emergency fund"
          required
        />
      </label>
      <label>
        Target amount
        <input
          type="number"
          min="1"
          step="0.01"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="10000"
          required
        />
      </label>
      <button type="submit" className="primary-button" disabled={busy}>
        {busy ? "Saving..." : "Save goal"}
      </button>
    </form>
  );
}

function History({
  token,
  entries,
  onError,
  onChanged,
}: {
  token: string;
  entries: SavingsEntry[];
  onError: (message: string) => void;
  onChanged: () => Promise<void>;
}) {
  async function handleDelete(entry: SavingsEntry) {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteEntry(token, entry.id);
      await onChanged();
    } catch (requestError) {
      onError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the entry.",
      );
    }
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <strong>No entries yet</strong>
        <p>Add your first deposit to start tracking your savings.</p>
      </div>
    );
  }

  return (
    <ul className="history-list">
      {entries.map((entry) => {
        const deposit = entry.type === "deposit";

        return (
          <li key={entry.id} className="history-item">
            <span className={`type-dot ${entry.type}`} />
            <div className="history-copy">
              <strong>{entry.note || (deposit ? "Deposit" : "Withdrawal")}</strong>
              <span>{formatDate(entry.date)}</span>
            </div>
            <strong className={deposit ? "amount-positive" : "amount-negative"}>
              {deposit ? "+" : "-"}
              {money.format(Number(entry.amount))}
            </strong>
            <button
              type="button"
              className="delete-button"
              onClick={() => handleDelete(entry)}
              aria-label="Delete entry"
            >
              x
            </button>
          </li>
        );
      })}
    </ul>
  );
}

