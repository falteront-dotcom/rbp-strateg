// C2 Manager — Command & Control hierarchy for tactical units
// Manages command nodes, order propagation, and chain of command

export interface Command {
  orderId: string;
  type: string;
  targetPos?: { x: number; y: number };
  params?: Record<string, unknown>;
}

export class CommandNode {
  nodeId: string;
  level: number;
  subordinates: CommandNode[] = [];
  superior: CommandNode | null = null;
  lastKnownOrder: Command | null = null;

  constructor(nodeId: string, level: number) {
    this.nodeId = nodeId;
    this.level = level;
  }

  addSubordinate(node: CommandNode): void {
    this.subordinates.push(node);
    node.superior = this;
  }

  issueOrder(order: Command): void {
    this.lastKnownOrder = order;
    for (const sub of this.subordinates) {
      sub.issueOrder(order);
    }
  }
}

export class C2Manager {
  nodes: Map<string, CommandNode> = new Map();
  root: CommandNode | null = null;

  registerUnit(unitId: string, level: number): void {
    const node = new CommandNode(unitId, level);
    this.nodes.set(unitId, node);
    if (!this.root) {
      this.root = node;
    } else {
      this.root.addSubordinate(node);
    }
  }

  getCommandPath(unitId: string): CommandNode[] {
    const node = this.nodes.get(unitId);
    if (!node) return [];
    const path: CommandNode[] = [];
    let current: CommandNode | null = node;
    while (current) {
      path.unshift(current);
      current = current.superior;
    }
    return path;
  }

  broadcastOrder(order: Command): void {
    if (this.root) {
      this.root.issueOrder(order);
    }
  }

  getUnitOrder(unitId: string): Command | null {
    const node = this.nodes.get(unitId);
    return node?.lastKnownOrder ?? null;
  }
}
