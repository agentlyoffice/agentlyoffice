import { JsonLd } from "@/components/JsonLd";
import { OfficeApp } from "@/components/office/OfficeApp";
import { appLd } from "@/lib/seo";

export default function Home() {
  return (
    <>
      <JsonLd data={appLd} />
      <OfficeApp />
    </>
  );
}
