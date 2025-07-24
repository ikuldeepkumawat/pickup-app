import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { GraphqlClient } from "@shopify/shopify-api"; // ✅ correct import

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!session) {
    console.error("No session found for webhook");
    return new Response("No session", { status: 401 });
  }

  const orderGid = payload.admin_graphql_api_id;

  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
          type
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: orderGid,
        namespace: "pickup_settings",
        key: "pickup_message",
        value: "Thanks for ordering with us!",
        type: "single_line_text_field",
      },
    ],
  };

  // ✅ Create GraphQL client using session
  const client = new GraphqlClient({ session });

  const result = await client.query({
    data: {
      query: mutation,
      variables,
    },
  });

  console.log("Metafield Response:", result.body);

  return new Response("Metafield set", { status: 200 });
};



