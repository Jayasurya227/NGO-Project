import "./load-env";
import { StateGraph, END } from "@langchain/langgraph";
import { z } from "zod";

const StateSchema = z.object({
  input: z.string(),
  processed: z.string().optional(),
  isComplete: z.boolean().default(false),
});
type State = z.infer<typeof StateSchema>;

async function processNode(state: State): Promise<Partial<State>> {
  console.log("[processNode] Input:", state.input);
  return { processed: state.input.toUpperCase() };
}

async function checkNode(state: State): Promise<Partial<State>> {
  console.log("[checkNode] Processed:", state.processed);
  return { isComplete: true };
}

function shouldContinue(state: State): string {
  return state.processed ? "check" : END;
}

const graph = new StateGraph<State>({ channels: {} as any })
  .addNode("process", processNode)
  .addNode("check", checkNode)
  .addEdge("__start__", "process")
  .addConditionalEdges("process", shouldContinue, {
    check: "check",
    [END]: END,
  })
  .addEdge("check", END)
  .compile();

async function main() {
  const result = await graph.invoke({ input: "hello langgraph" });
  console.log("Final state:", result);
}

main().catch(console.error);