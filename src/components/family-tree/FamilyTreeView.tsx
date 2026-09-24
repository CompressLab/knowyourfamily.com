"use client";
import { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ZoomIn, ZoomOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { getInitials } from "@/lib/utils";
import type { Person } from "@/types";

const NODE_W = 140;
const NODE_H = 80;

// Custom family tree node
function PersonNode({ data }: { data: any }) {
  const initials = getInitials(data.label);
  const isRoot = data.isRoot;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 bg-white shadow-md cursor-pointer transition-shadow hover:shadow-lg ${
        isRoot ? "border-amber-400 bg-amber-50" : "border-stone-200 hover:border-amber-300"
      }`}
      style={{ width: NODE_W, minHeight: NODE_H }}
      onClick={() => data.onClick && data.onClick(data.personId)}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-300 !border-amber-400 !w-2 !h-2" />
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm text-sm font-bold ${
        isRoot ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600"
      }`}>
        {data.photoUrl ? (
          <img src={data.photoUrl} alt={data.label} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <span className="text-[11px] font-semibold text-stone-900 text-center leading-tight max-w-[120px] truncate">
        {data.label}
      </span>
      {data.relationshipLabel && (
        <span className="text-[9px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full capitalize">
          {data.relationshipLabel}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-300 !border-amber-400 !w-2 !h-2" />
    </motion.div>
  );
}

const nodeTypes = { person: PersonNode };

// Layout using dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 30, marginy: 30 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
    }),
    edges,
  };
}

interface FamilyTreeViewProps {
  rootPersonId?: string;
}

export function FamilyTreeView({ rootPersonId }: FamilyTreeViewProps) {
  const { person: myPerson } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rootId = rootPersonId ?? myPerson?.id;

  const buildTree = useCallback(async () => {
    if (!rootId) return;
    setLoading(true);
    try {
      // Get all accepted family relationships for the root person (2 hops)
      const visited = new Set<string>();
      const personMap = new Map<string, Person>();
      const relPairs: Array<{ from: string; to: string; type: string }> = [];

      const queue = [rootId];
      let hop = 0;

      while (queue.length > 0 && hop < 2) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const { data: rels } = await supabase
          .from("relationships")
          .select(`
            id, relationship_type, person_a_id, person_b_id,
            person_a:people!relationships_person_a_id_fkey(id, full_name, current_photo_path),
            person_b:people!relationships_person_b_id_fkey(id, full_name, current_photo_path)
          `)
          .or(`person_a_id.eq.${current},person_b_id.eq.${current}`)
          .eq("status", "accepted");

        if (!rels) continue;

        rels.forEach((r: any) => {
          const personA = r.person_a;
          const personB = r.person_b;
          if (personA) personMap.set(personA.id, personA);
          if (personB) personMap.set(personB.id, personB);

          // Determine direction: parents above, children below
          const type = r.relationship_type;
          if (["parent", "grandparent"].includes(type)) {
            relPairs.push({ from: personA.id, to: personB.id, type });
          } else if (["child", "grandchild"].includes(type)) {
            relPairs.push({ from: personA.id, to: personB.id, type });
          } else {
            relPairs.push({ from: personA.id, to: personB.id, type });
          }

          if (personA && !visited.has(personA.id)) queue.push(personA.id);
          if (personB && !visited.has(personB.id)) queue.push(personB.id);
        });
        hop++;
      }

      if (personMap.size === 0) {
        setLoading(false);
        return;
      }

      const rawNodes: Node[] = Array.from(personMap.values()).map((p) => ({
        id: p.id,
        type: "person",
        position: { x: 0, y: 0 },
        data: {
          label: p.full_name,
          personId: p.id,
          isRoot: p.id === rootId,
          relationshipLabel: relPairs.find(r => r.from === p.id || r.to === p.id)?.type,
          onClick: (id: string) => router.push(`/people/${id}`),
        },
      }));

      const rawEdges: Edge[] = relPairs.map((r, i) => ({
        id: `e-${i}`,
        source: r.from,
        target: r.to,
        type: "smoothstep",
        label: r.type,
        labelStyle: { fontSize: 9, fill: "#a8a29e" },
        style: { stroke: "#f59e0b", strokeWidth: 1.5 },
        animated: r.type === "spouse",
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#f59e0b" },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (e) {
      setError("Failed to load family tree.");
    } finally {
      setLoading(false);
    }
  }, [rootId, supabase, router, setNodes, setEdges]);

  useEffect(() => { buildTree(); }, [buildTree]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-stone-500">Building your family tree…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">{error}</div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Users className="w-8 h-8 text-amber-300" />
        </div>
        <p className="text-stone-500 text-center max-w-xs">
          No family connections yet. Add family members or send connection requests to build your tree.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ minHeight: 600 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f5f5f4" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => n.data?.isRoot ? "#f59e0b" : "#e7e5e4"}
          maskColor="rgba(245,245,244,0.7)"
          className="!rounded-xl !border-stone-200"
        />
      </ReactFlow>
    </div>
  );
}
