import type { ManagedAsset } from "./assets";

export type AssetTreeNode = {
  asset: ManagedAsset;
  children: AssetTreeNode[];
};

export type AssetTreeRow = {
  asset: ManagedAsset;
  depth: number;
  hasChildren: boolean;
};

/**
 * Build a forest from a flat asset list via parentKey.
 * Roots: parentKey is null or the parent key is missing from the list.
 * Cycles are broken by skipping already-visited keys on a path.
 */
export function buildAssetTree(
  assets: ManagedAsset[],
  compare: (a: ManagedAsset, b: ManagedAsset) => number,
): AssetTreeNode[] {
  const byKey = new Map<string, ManagedAsset>();
  for (const asset of assets) {
    byKey.set(asset.key, asset);
  }

  const childrenByParent = new Map<string | null, ManagedAsset[]>();
  for (const asset of assets) {
    const parentKey =
      asset.parentKey && byKey.has(asset.parentKey) ? asset.parentKey : null;
    const list = childrenByParent.get(parentKey);
    if (list) list.push(asset);
    else childrenByParent.set(parentKey, [asset]);
  }

  function buildNodes(
    parentKey: string | null,
    path: Set<string>,
  ): AssetTreeNode[] {
    const siblings = childrenByParent.get(parentKey) ?? [];
    const sorted = [...siblings].sort(compare);
    const nodes: AssetTreeNode[] = [];
    for (const asset of sorted) {
      if (path.has(asset.key)) continue;
      const nextPath = new Set(path);
      nextPath.add(asset.key);
      nodes.push({
        asset,
        children: buildNodes(asset.key, nextPath),
      });
    }
    return nodes;
  }

  return buildNodes(null, new Set());
}

/** Keys of nodes that have at least one child. */
export function collectExpandableKeys(nodes: AssetTreeNode[]): string[] {
  const keys: string[] = [];
  function walk(list: AssetTreeNode[]) {
    for (const node of list) {
      if (node.children.length > 0) {
        keys.push(node.asset.key);
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return keys;
}

/**
 * Keep nodes that match the predicate and all of their ancestors.
 * Non-matching branches without a matching descendant are dropped.
 */
export function filterAssetTree(
  nodes: AssetTreeNode[],
  predicate: (asset: ManagedAsset) => boolean,
): AssetTreeNode[] {
  const result: AssetTreeNode[] = [];
  for (const node of nodes) {
    const children = filterAssetTree(node.children, predicate);
    if (predicate(node.asset) || children.length > 0) {
      result.push({ asset: node.asset, children });
    }
  }
  return result;
}

/** Ancestor keys that must be expanded so every leaf/match path is visible. */
export function collectForcedExpandKeys(nodes: AssetTreeNode[]): string[] {
  const keys: string[] = [];
  function walk(list: AssetTreeNode[]) {
    for (const node of list) {
      if (node.children.length > 0) {
        keys.push(node.asset.key);
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return keys;
}

export function flattenVisibleRows(
  nodes: AssetTreeNode[],
  expandedKeys: ReadonlySet<string>,
): AssetTreeRow[] {
  const rows: AssetTreeRow[] = [];

  function walk(list: AssetTreeNode[], depth: number) {
    for (const node of list) {
      const hasChildren = node.children.length > 0;
      rows.push({ asset: node.asset, depth, hasChildren });
      if (hasChildren && expandedKeys.has(node.asset.key)) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(nodes, 0);
  return rows;
}
