import { useRef } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Box,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  useFetcher();

  // Code block refs
  const originalLinePriceRef = useRef<HTMLPreElement>(null);
  const variantPriceRef = useRef<HTMLPreElement>(null);

  const handleCopy = (ref: React.RefObject<HTMLPreElement>) => {
    if (ref.current) {
      navigator.clipboard.writeText(ref.current.innerText);
      alert("Code copied to clipboard!");
    }
  };

  return (
    <Page fullWidth>
      <TitleBar title="Pickup Deskboard" />

      <BlockStack gap="500">
        <Layout>
          {/* 💰 Card 1: Replace original_line_price */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h4" variant="headingMd">Navigate to the Theme, open the 'Sections' folder, locate the mentioned files, and paste the required code.</Text>
                <Text as="p">
                  Go to the <b>main-cart-items.liquid</b> file and replace{" "}
                  <Text as="span" fontWeight="bold">
                    {`{{ item.original_line_price | money }}`}
                  </Text>{" "}
                  with the following code:
                </Text>

                <InlineStack align="space-between">
                  <Text as="span" fontWeight="bold">Liquid Code:</Text>
                  <Button
                    size="slim"
                    onClick={() => handleCopy(originalLinePriceRef)}
                  >
                    Copy
                  </Button>
                </InlineStack>

                <Box
                  as="div"
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  overflowX="scroll"
                  maxWidth="100%"
                >
                  <pre ref={originalLinePriceRef} style={{ margin: 0 }}>
{`{%- liquid
  assign pickup = item.variant.price | times: item.quantity
-%}
{% if pickup != item.original_line_price %}
  {{ pickup | money }} + {{ item.original_line_price | minus: pickup | money }}
{% else %}
  {{ item.original_line_price | money }}
{% endif %}`}
                  </pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 🧾 Card 2: Replace variant price with discount breakdown */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="p">
                  Go to the <b>main-cart-items.liquid</b> file and replace{" "}
                  <Text as="span" fontWeight="bold">
                    {`{{ item.original_price | money }}`}
                  </Text>{" "}
                  with the following code:
                </Text>

                <InlineStack align="space-between">
                  <Text as="span" fontWeight="bold">Liquid Code:</Text>
                  <Button
                    size="slim"
                    onClick={() => handleCopy(variantPriceRef)}
                  >
                    Copy
                  </Button>
                </InlineStack>

                <Box
                  as="div"
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  overflowX="scroll"
                  maxWidth="100%"
                >
                  <pre ref={variantPriceRef} style={{ margin: 0 }}>
{`{% if item.variant.price != item.original_price %}
  {{ item.variant.price | money }} + 
  {{ item.original_price | minus: item.variant.price | money }}
{% else %}
  {{ item.original_price | money }}
{% endif %}`}
                  </pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
