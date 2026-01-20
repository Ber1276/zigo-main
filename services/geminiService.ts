import { GoogleGenAI, Type } from "@google/genai";
import { ToolDefinition, ParameterType } from "../types";

// Helper to create a partial tool definition from AI
export const generateToolFromDescription = async (
  description: string
): Promise<Partial<ToolDefinition> | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    你是一位专业的 API 架构师。你的任务是分析 API 的自然语言描述或 cURL 命令，并将其结构化为工具注册表的 JSON 模式。
    
    用户将提供类似于“创建一个工具，使用 https://api.weather.com/v1/current?city=London&apikey=123 获取城市天气数据”的文本或原始 CURL 命令。
    
    你必须提取以下内容：
    1. Name (简短，PascalCase 或 camelCase)
    2. Description (清晰，简洁，中文)
    3. Method (GET, POST, 等)
    4. BaseUrl (域名部分)
    5. Endpoint (路径部分)
    6. Parameters (查询参数，请求体参数)。
    
    将参数类型映射为：STRING, NUMBER, BOOLEAN, JSON, SELECT。
    请确保 label 和 description 使用中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: description,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            method: { type: Type.STRING, enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
            baseUrl: { type: Type.STRING },
            endpoint: { type: Type.STRING },
            parameters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["STRING", "NUMBER", "BOOLEAN", "JSON", "SELECT"] },
                  required: { type: Type.BOOLEAN },
                  description: { type: Type.STRING },
                  defaultValue: { type: Type.STRING }
                },
                required: ["key", "type", "required"]
              }
            }
          },
          required: ["name", "method", "parameters"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    
    // Add IDs to parameters as the AI doesn't generate UUIDs nicely
    const paramsWithIds = data.parameters.map((p: any) => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      options: []
    }));

    return {
      ...data,
      parameters: paramsWithIds
    };

  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};

// Simulate an API call response using Gemini
export const simulateApiCall = async (
  tool: ToolDefinition,
  params: Record<string, any>
): Promise<any> => {
  if (!process.env.API_KEY) {
    return { error: "API Key missing" };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a mock server. You will receive a tool definition (API endpoint) and a set of parameters.
    Your job is to generate a REALISTIC JSON response that this API would return.
    Do not return markdown, only the JSON object.
    If the parameters indicate an error (like missing required fields), simulate an error response.
    The response should be rich and detailed, matching the context of the tool (e.g. weather data, user data, slack response).
  `;

  try {
    const prompt = `
      Tool Name: ${tool.name}
      Description: ${tool.description}
      Method: ${tool.method}
      URL: ${tool.baseUrl}${tool.endpoint}
      
      Parameters Provided:
      ${JSON.stringify(params, null, 2)}
      
      Generate a realistic JSON response body.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Simulation error", error);
    return {
      status: "error",
      message: "Failed to simulate API response",
      details: String(error)
    };
  }
};