import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  NavigationType,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { setPanelTransitionDirection } from "../../lib/panelTransition";

type StackEntry = {
  pathname: string;
  showBack: boolean;
};

type BackNavigationValue = {
  canGoBack: boolean;
  goBack: () => void;
};

const BackNavigationContext = createContext<BackNavigationValue | null>(null);

function historyIdx(): number {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === "number" ? state.idx : 0;
}

function appId(pathname: string): string {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

function isEditPanel(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[1] === "new") return true;
  if (parts.length === 3 && parts[2] === "edit") return true;
  return false;
}

function isListPanel(pathname: string): boolean {
  return !isEditPanel(pathname);
}

function shouldShowBack(fromPathname: string, toPathname: string): boolean {
  if (appId(fromPathname) !== appId(toPathname)) return true;
  return isListPanel(fromPathname) && isEditPanel(toPathname);
}

function shouldAnimatePanelBack(
  currentPathname: string,
  previousPathname: string,
): boolean {
  return (
    isEditPanel(currentPathname) &&
    isListPanel(previousPathname) &&
    appId(currentPathname) === appId(previousPathname)
  );
}

export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const stackRef = useRef<StackEntry[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  useLayoutEffect(() => {
    const idx = historyIdx();
    const pathname = location.pathname;
    const stack = stackRef.current;

    if (navigationType === NavigationType.Push) {
      const previous = stack[idx - 1];
      const showBack = previous
        ? shouldShowBack(previous.pathname, pathname)
        : false;
      stack.length = idx;
      stack.push({ pathname, showBack });
    } else if (navigationType === NavigationType.Replace) {
      const under = idx > 0 ? stack[idx - 1] : undefined;
      const showBack = under
        ? shouldShowBack(under.pathname, pathname)
        : false;
      stack.length = idx;
      stack.push({ pathname, showBack });
    } else {
      if (stack.length === 0) {
        stack.push({ pathname, showBack: false });
      } else {
        stack.length = Math.min(stack.length, idx + 1);
        if (!stack[idx]) {
          stack.length = 0;
          stack.push({ pathname, showBack: false });
        } else {
          stack[idx] = { ...stack[idx], pathname };
        }
      }
    }

    setCanGoBack(stack[stack.length - 1]?.showBack ?? false);
  }, [location.pathname, location.key, navigationType]);

  const goBack = useCallback(() => {
    const stack = stackRef.current;
    if (stack.length < 2) return;
    const current = stack[stack.length - 1];
    const previous = stack[stack.length - 2];
    if (!current || !previous) return;

    if (shouldAnimatePanelBack(current.pathname, previous.pathname)) {
      setPanelTransitionDirection("back");
      // Delta + options: RR overload types reject the pair; runtime accepts it.
      (
        navigate as (
          delta: number,
          options?: { viewTransition?: boolean },
        ) => void
      )(-1, { viewTransition: true });
      return;
    }

    navigate(-1);
  }, [navigate]);

  const value = useMemo(
    () => ({ canGoBack, goBack }),
    [canGoBack, goBack],
  );

  return (
    <BackNavigationContext.Provider value={value}>
      {children}
    </BackNavigationContext.Provider>
  );
}

export function useBackNavigation(): BackNavigationValue {
  const value = useContext(BackNavigationContext);
  if (!value) {
    throw new Error(
      "useBackNavigation must be used within BackNavigationProvider",
    );
  }
  return value;
}
