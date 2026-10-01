import Portfolio from "@/components/portfolio";
import { getPortfolioData } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getPortfolioData();
  return <Portfolio content={content} />;
}
