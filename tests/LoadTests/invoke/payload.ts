import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

export interface InvokePayload {
  input: {
    query: string;
    workspace_id: number;
    user_config: {
      session_id: string;
      llm_model: string;
      user_id: string;
      group_ids: string[];
      agent_label: string;
      include_recommendations: boolean;
      force_regenerate: boolean;
      include_insights: boolean;
      refresh_data: boolean;
    };
    additional_info: {
      query_id: number;
      system_prompt: string;
      source_screen: string;
      run_id: string;
    };
  };
  kwargs: Record<string, unknown>;
  config: Record<string, unknown>;
}

export function buildPayload(query: string): InvokePayload {
  return {
    input: {
      query,
      workspace_id: 1438,
      user_config: {
        session_id: Math.floor(Math.random() * 1e8)
          .toString()
          .padStart(8, "0"),
        llm_model: "gpt",
        user_id: "",
        group_ids: [],
        agent_label: "dataviz",
        include_recommendations: true,
        force_regenerate: true,
        include_insights: true,
        refresh_data: true,
      },
      additional_info: {
        query_id: 0,
        system_prompt: "",
        source_screen: "dashboard",
        run_id: uuidv4(),
      },
    },
    kwargs: {},
    config: {},
  };
}
