import axios, { AxiosInstance } from "axios";

export class SpendAgentClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    if (!baseURL) throw new Error("BASE_URL is missing in environment variables");

    console.log("API BASE URL:", baseURL);

    this.client = axios.create({
      baseURL,
      timeout: 230000,
      headers: {
        "Content-Type": "application/json"
      }
    });

    this.client.interceptors.request.use((config) => {
      console.log("\n================ REQUEST ================");
      console.log("URL:", config.baseURL + config.url);
      console.log("METHOD:", config.method?.toUpperCase());
      console.log("HEADERS:", JSON.stringify(config.headers, null, 2));
      if (config.data) {
        console.log("BODY:", JSON.stringify(config.data, null, 2));
      }
      console.log("======\n");
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.log("\n================ RESPONSE ================");
        console.log("STATUS:", response.status);
        console.log("FROM:", response.config.url);
        console.log("DATA:", JSON.stringify(response.data, null, 2));
        console.log("==========================================\n");
        return response;
      },
      (error) => {
        console.log("\n================ ERROR ===================");
        if (error.response) {
          console.log("STATUS:", error.response.status);
          console.log("DATA:", JSON.stringify(error.response.data, null, 2));
        } else {
          console.log("ERROR MESSAGE:", error.message);
        }
        console.log("==========================================\n");
        return Promise.reject(error);
      }
    );
  }

  generateSessionId(): string {
    return String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  }

  async invoke(query: string, runId: string, previousQuery = "") {
    const session_id = this.generateSessionId();

    console.log("Session ID:", session_id);
    console.log("Query:", query);

    const payload: any = {
      input: {
        query,
        workspace_id: 1173,
        user_config: {
          session_id,
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
          run_id: runId,
        },
        previous_query: previousQuery,
      },
      kwargs: {},
      config: {},
    };

    // FIX: remove empty previous_query
    if (!previousQuery) delete payload.input.previous_query;

    console.log("Final Payload:", JSON.stringify(payload, null, 2));

    console.time("Invoke API Duration");
    const res = await this.client.post("/react/invoke", payload);
    console.timeEnd("Invoke API Duration");

    return {
      data: res.data,
      session_id,
    };
  }
}
