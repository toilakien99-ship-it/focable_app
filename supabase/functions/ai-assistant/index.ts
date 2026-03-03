import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Bạn là Foca - trợ lý AI của ứng dụng Focable, chuyên giúp người dùng xây dựng kỷ luật số và tập trung tốt hơn.

Nhiệm vụ của bạn:
- Phân tích thói quen và đưa ra lời khuyên cá nhân hóa
- Nhắc nhở người dùng khi họ mất kỷ luật
- Gợi ý thời gian tập trung tốt nhất dựa trên lịch sử
- Hỗ trợ tinh thần và động lực
- Không phán xét, luôn tích cực và thực tế

Nguyên tắc:
- Trả lời ngắn gọn (tối đa 3-4 câu trừ khi cần phân tích)
- Dùng tiếng Việt thân thiện, không quá trang trọng
- Dựa trên dữ liệu thực tế của người dùng khi có
- Không bịa đặt thông tin`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/ai-assistant/, "");

    if (req.method === "DELETE" && path === "/history") {
      await supabase.from("ai_conversations").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && path === "/history") {
      const { data } = await supabase
        .from("ai_conversations")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(40);
      return new Response(JSON.stringify({ history: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { message, context } = body as { message: string; context?: Record<string, unknown> };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: history } = await supabase
      .from("ai_conversations")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const contextNote = context
      ? `\n\nDữ liệu người dùng hiện tại:\n${JSON.stringify(context, null, 2)}`
      : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...(history ?? []).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let reply = "";

    if (openaiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 400,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      reply = data.choices?.[0]?.message?.content ?? "Tôi không thể trả lời lúc này.";
    } else {
      reply = generateFallbackReply(message, context);
    }

    await supabase.from("ai_conversations").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackReply(message: string, context?: Record<string, unknown>): string {
  const lower = message.toLowerCase();
  const tasksCompleted = (context?.tasks_completed as number) ?? 0;
  const focusMinutes = (context?.focus_minutes as number) ?? 0;

  if (lower.includes("nhiệm vụ") || lower.includes("task")) {
    if (tasksCompleted === 0) return "Bạn chưa hoàn thành nhiệm vụ nào hôm nay. Hãy bắt đầu với một nhiệm vụ nhỏ nhất để tạo đà nhé!";
    return `Bạn đã hoàn thành ${tasksCompleted} nhiệm vụ hôm nay - tốt lắm! Hãy tiếp tục duy trì phong độ này.`;
  }
  if (lower.includes("tập trung") || lower.includes("focus")) {
    if (focusMinutes < 30) return "Bạn chưa có phiên tập trung nào hôm nay. Thử 25 phút Pomodoro đầu tiên ngay bây giờ nhé!";
    return `Bạn đã tập trung ${focusMinutes} phút hôm nay. ${focusMinutes >= 90 ? "Xuất sắc! Đừng quên nghỉ ngơi." : "Hãy thêm vài phiên nữa để đạt mục tiêu!"}`;
  }
  if (lower.includes("mệt") || lower.includes("buồn") || lower.includes("chán")) {
    return "Mệt mỏi là bình thường. Hãy nghỉ 10 phút, uống nước và đi lại một chút - não bạn cần nạp lại năng lượng!";
  }
  if (lower.includes("điện thoại") || lower.includes("mạng xã hội")) {
    return "Hãy thử đặt điện thoại xuống và thử thách bản thân 30 phút không chạm vào mạng xã hội. Bạn sẽ ngạc nhiên với lượng việc mình làm được!";
  }
  return "Tôi đang lắng nghe bạn! Hãy cho tôi biết bạn cần hỗ trợ gì về kỷ luật hay tập trung hôm nay nhé.";
}
