import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FC, type ReactNode } from "react";
import { type BaseLocationHook, Link, Switch, useLocation, Route as WouterRoute, Router as WouterRouter } from "wouter";
import {
	beginOperatorLogin,
	finishOperatorLogin,
	logoutOperator,
	operatorSession,
	resolveAuthority,
	type AuthState,
	type BrowserLoginConfig,
} from "./operator-auth.ts";
import { createGitHubOperatorSource, type OperatorReadSource } from "./operator-data.ts";
import { OperatorView, SURFACES } from "./operator-views.tsx";
import { type QuotaDashboardState } from "./quota.tsx";
import { operatorStyles } from "./web-style.ts";
import { operatorPathFromLocation } from "./site-contract.ts";

interface RouterProps {
	basename?: string;
	/** Embedders/tests can provide their own wouter location source. Web defaults to Pages-safe hash routing. */
	hook?: BaseLocationHook;
	children: ReactNode;
}
function hashPath(): string {
	if (typeof window === "undefined") return "/";
	const raw = window.location.hash.replace(/^#/u, "");
	if (raw.startsWith("/")) return raw;
	const base = document.querySelector<HTMLMetaElement>('meta[name="darkfactory-base-path"]')?.content ?? "/";
	return operatorPathFromLocation(window.location.pathname, base);
}
function subscribeHash(onChange: () => void): () => void {
	if (typeof window === "undefined") return () => undefined;
	window.addEventListener("hashchange", onChange);
	window.addEventListener("popstate", onChang¶»§q«^