import { IconHeartbeat } from "@tabler/icons-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HealthResponse = {
  status: "ok" | "error";
  database: "up" | "down";
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; health: HealthResponse }
  | { kind: "failed"; message: string };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:3010";

export default function IndexScreen() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        const body = (await response.json()) as HealthResponse;
        if (!cancelled) {
          setState({ kind: "ready", health: body });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "failed",
            message: error instanceof Error ? error.message : "Unbekannter Fehler",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const databaseLabel =
    state.kind === "ready"
      ? state.health.database
      : state.kind === "loading"
        ? "…"
        : "unreachable";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <IconHeartbeat size={40} strokeWidth={1.5} color="#1c2434" />
        <Text style={styles.title}>Pulse</Text>
        <Text style={styles.subtitle}>CMMS – Grundgerüst</Text>
        <Text style={styles.status}>
          Database: <Text style={styles.strong}>{databaseLabel}</Text>
        </Text>
        {state.kind === "failed" ? (
          <Text style={styles.error}>{state.message}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6f9",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#d8dee9",
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "700",
    color: "#1c2434",
  },
  subtitle: {
    marginTop: 4,
    color: "#5b6577",
  },
  status: {
    marginTop: 20,
    color: "#5b6577",
  },
  strong: {
    fontWeight: "700",
    color: "#1c2434",
  },
  error: {
    marginTop: 8,
    color: "#b42318",
    textAlign: "center",
  },
});
