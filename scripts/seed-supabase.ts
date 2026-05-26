import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600 * 1000).toISOString();

const sources = [
  {
    id: "openai",
    name: "OpenAI",
    domain: "openai.com",
    color: "green",
    logo_path: "/assets/openai-logo.webp",
    feed_url: "https://openai.com/news/rss.xml",
    is_active: true,
    last_crawled_at: hoursAgo(3),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    domain: "anthropic.com",
    color: "orange",
    logo_path: "/assets/anthropic-logo.png",
    feed_url: null,
    is_active: true,
    last_crawled_at: hoursAgo(2),
  },
  {
    id: "deepmind",
    name: "Google DeepMind",
    domain: "deepmind.google",
    color: "blue",
    logo_path: "/assets/deepmind-logo.webp",
    feed_url: "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/rss/",
    is_active: true,
    last_crawled_at: hoursAgo(4),
  },
];

const articles = [
  {
    title: "Introducing GPT-4.1 in the API",
    excerpt: "OpenAI introduced GPT-4.1 models with stronger coding, instruction following, and long-context performance for developers.",
    url: "https://openai.com/index/gpt-4-1/",
    source_id: "openai",
    source_domain: "openai.com",
    author: "OpenAI",
    category: "models",
    hero_variant: "spiral",
    read_minutes: 6,
    published_at: hoursAgo(5),
    crawled_at: hoursAgo(3),
  },
  {
    title: "Claude 3.7 Sonnet and Claude Code",
    excerpt: "Anthropic released Claude 3.7 Sonnet, a hybrid reasoning model, alongside a command line coding assistant for agentic development.",
    url: "https://www.anthropic.com/news/claude-3-7-sonnet",
    source_id: "anthropic",
    source_domain: "anthropic.com",
    author: "Anthropic",
    category: "models",
    hero_variant: "aurora",
    read_minutes: 7,
    published_at: hoursAgo(8),
    crawled_at: hoursAgo(2),
  },
  {
    title: "Gemini 2.5: our most intelligent AI model",
    excerpt: "Google DeepMind announced Gemini 2.5 with improved reasoning capabilities across complex tasks and multimodal inputs.",
    url: "https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/",
    source_id: "deepmind",
    source_domain: "deepmind.google",
    author: "Google DeepMind",
    category: "research",
    hero_variant: "grid",
    read_minutes: 8,
    published_at: hoursAgo(12),
    crawled_at: hoursAgo(4),
  },
  {
    title: "OpenAI o3 and o4-mini",
    excerpt: "New reasoning models improve performance on coding, math, science, and visual understanding while giving developers a range of latency and cost options.",
    url: "https://openai.com/index/introducing-o3-and-o4-mini/",
    source_id: "openai",
    source_domain: "openai.com",
    author: "OpenAI",
    category: "models",
    hero_variant: "code",
    read_minutes: 5,
    published_at: hoursAgo(24),
    crawled_at: hoursAgo(3),
  },
  {
    title: "Claude can now use a computer",
    excerpt: "Anthropic introduced a public beta for computer use, enabling Claude to interact with interfaces through a controlled tool environment.",
    url: "https://www.anthropic.com/news/3-5-models-and-computer-use",
    source_id: "anthropic",
    source_domain: "anthropic.com",
    author: "Anthropic",
    category: "product",
    hero_variant: "desktop",
    read_minutes: 7,
    published_at: hoursAgo(36),
    crawled_at: hoursAgo(2),
  },
  {
    title: "AlphaFold 3 predicts the structure and interactions of life's molecules",
    excerpt: "Google DeepMind expanded AlphaFold to model proteins, DNA, RNA, ligands, and their interactions with broad scientific applications.",
    url: "https://blog.google/technology/ai/google-deepmind-isomorphic-alphafold-3-ai-model/",
    source_id: "deepmind",
    source_domain: "deepmind.google",
    author: "Google DeepMind",
    category: "science",
    hero_variant: "helix",
    read_minutes: 10,
    published_at: hoursAgo(48),
    crawled_at: hoursAgo(4),
  },
  {
    title: "Preparedness framework update",
    excerpt: "OpenAI shared updates to its framework for tracking, evaluating, and mitigating frontier model risks before deployment.",
    url: "https://openai.com/safety/preparedness/",
    source_id: "openai",
    source_domain: "openai.com",
    author: "OpenAI Safety",
    category: "safety",
    hero_variant: "lattice",
    read_minutes: 9,
    published_at: hoursAgo(60),
    crawled_at: hoursAgo(3),
  },
  {
    title: "Responsible Scaling Policy",
    excerpt: "Anthropic described a framework for capability evaluations and deployment safeguards as frontier systems become more capable.",
    url: "https://www.anthropic.com/news/anthropics-responsible-scaling-policy",
    source_id: "anthropic",
    source_domain: "anthropic.com",
    author: "Anthropic",
    category: "safety",
    hero_variant: "shield",
    read_minutes: 11,
    published_at: hoursAgo(84),
    crawled_at: hoursAgo(2),
  },
];

const topics = [
  { name: "Reasoning", trend_score: 94 },
  { name: "Agents", trend_score: 87 },
  { name: "Multimodality", trend_score: 76 },
  { name: "Interpretability", trend_score: 62 },
  { name: "Open weights", trend_score: 58 },
  { name: "Long context", trend_score: 47 },
];

async function main() {
  const { error: sourceError } = await supabase.from("sources").upsert(sources, { onConflict: "id" });
  if (sourceError) throw sourceError;

  const { data: savedArticles, error: articleError } = await supabase
    .from("articles")
    .upsert(articles, { onConflict: "url" })
    .select("id, title");
  if (articleError) throw articleError;

  const { error: topicError } = await supabase.from("topics").upsert(topics, { onConflict: "name" });
  if (topicError) throw topicError;

  const metrics = (savedArticles ?? []).map((article, index) => ({
    article_id: article.id,
    view_count: [24100, 19800, 15200, 12700, 9400, 8100, 7300, 6900][index] ?? 1000,
  }));

  const { error: metricError } = await supabase.from("article_metrics").upsert(metrics, { onConflict: "article_id" });
  if (metricError) throw metricError;

  console.log(`Seeded ${sources.length} sources, ${articles.length} articles, and ${topics.length} topics.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
