"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return <form action={action} className="login-form">
    <label>Usuário<input name="username" autoComplete="username" minLength={3} maxLength={64} required autoFocus /></label>
    <label>Senha<input name="password" type="password" autoComplete="current-password" maxLength={128} required /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button primary full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
  </form>;
}
