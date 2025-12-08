import axios from "axios";

export class LangfuseClient {
  private client;
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.LANGFUSE_BASE_URL ||
      "https://langfuse.awsp.oraczen.xyz";

    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;

    this.client = axios.create({
      baseURL: this.baseUrl + "/api/public",
      auth: {
        username: publicKey || "",
        password: secretKey || "",
      },
      timeout: 180000, // FIX: Long timeout to support slow Evals
    });
  }


  async getTraceFromSession(sessionId: string) {
    console.log(`Fetching traces for session: ${sessionId}`);

    try {
      const res = await this.client.get(`/sessions/${sessionId}`);
      const session = res?.data;

      if (!session || !session.traces || session.traces.length === 0) {
        console.log("No traces yet for this session.");
        return null;
      }

      // select the latest trace (safe & stable)
      const latestTrace = session.traces[session.traces.length - 1];

      console.log(`Selected Trace: ${latestTrace.id}`);
      return latestTrace;

    } catch (err: any) {
      if (err.code === "ECONNABORTED") {
        console.log("Langfuse session API timeout — retrying...");
        return null; // allow retry in polling loop
      }

      console.log("Error in getTraceFromSession:", err.message);
      return null;
    }
  }


  async getScoreByTraceId(traceId: string): Promise<number | null> {
    try {
      const res = await this.client.get(`/scores`, {
        params: { traceId },
      });

      const scores = res?.data?.data || [];

      const match = scores.find(
        (s: any) =>
          s.name === "nlp2sql_EVAL" &&
          s.traceId === traceId
      );

      return match ? match.value : null;

    } catch (err: any) {
      if (err.code === "ECONNABORTED") {
        console.log("Score API timeout — retrying...");
        return null;
      }

      console.log("Error in getScoreByTraceId:", err.message);
      return null;
    }
  }

 async waitForEvalScoreUsingSession(
   sessionId: string,
   timeoutMs = 90000,
   intervalMs = 2000
 ): Promise<number> {
   console.log(`Waiting for eval score via Session ID: ${sessionId}`);

   const start = Date.now();
   let traceId: string | null = null;

   while (Date.now() - start < timeoutMs) {
     const elapsed = Math.floor((Date.now() - start) / 1000);

     // If trace not yet fetched, try to fetch
     if (!traceId) {
       const trace = await this.getTraceFromSession(sessionId);
       if (trace && trace.id) {
         traceId = trace.id;
         console.log(`Trace found: ${traceId}`);
         console.log(`Now waiting for score...`);
       } else {
         console.log(`(${elapsed}s) Trace not ready yet...`);
       }
     }

     // If traceId known, try fetching score only
     if (traceId) {
       const score = await this.getScoreByTraceId(traceId);
       if (score !== null) {
         console.log(`Eval score ready after ${elapsed}s: ${score}`);
         return score;
       } else {
         console.log(`(${elapsed}s) Score not ready yet...`);
       }
     }

     await new Promise((r) => setTimeout(r, intervalMs));
   }

   throw new Error(`Eval score not found within ${timeoutMs}ms for session=${sessionId}`);
 }

  async getTraceByTag(tag: string) {
    try {
      const res = await this.client.get(`/traces`, {
        params: { tag },
      });

      const allTraces = res?.data?.data || [];

      const exactMatches = allTraces.filter(
        (t: any) => Array.isArray(t.tags) && t.tags.includes(tag)
      );

      if (exactMatches.length === 0) return null;

      exactMatches.sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return exactMatches[0];

    } catch (err) {
      console.log("Error in getTraceByTag:", err.message);
      return null;
    }
  }
}
