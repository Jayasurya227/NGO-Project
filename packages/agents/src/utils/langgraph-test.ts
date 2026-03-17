import { StateGraph, END, Annotation } from "@langchain/langgraph";

// Define state using Annotation (required for LangGraph 0.2.74+)
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  processed: Annotation<string | undefined>(),
  isComplete: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next,
  }),
});

type State = typeof StateAnnotation.State;

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

const graph = new StateGraph(StateAnnotation)
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