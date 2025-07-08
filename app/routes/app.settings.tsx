import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Box,
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  TextField,
  Button,
  Form,
  FormLayout,
  Toast,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useState, useCallback, useEffect } from "react";

// Define types for settings
interface ShippingSettings {
  threshold: number;
  fixedCharge: number;
  percentageCharge: number;
}

// Define loader response type
interface LoaderData {
  settings: ShippingSettings;
  shopId: string;
  error?: string;
}

// Define action response type
interface ActionData {
  success: boolean;
  message?: string;
  errors?: { field: string; message: string }[];
}

// Loader function - fetches shop metafields
export const loader = async ({ request }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `#graphql
      query getShopMetafields {
        shop {
          id
          metafields(first: 3, namespace: "shipping_settings") {
            edges {
              node {
                id
                key
                value
                namespace
                type
              }
            }
          }
        }
      }`
    );

    const responseJson = await response.json();
    const shopId = responseJson.data.shop.id;
    const metafields = responseJson.data.shop.metafields.edges;

    // Default settings
    const defaultSettings: ShippingSettings = {
      threshold: 500,
      fixedCharge: 15,
      percentageCharge: 4,
    };

    // Parse metafields into settings
    const settings: ShippingSettings = metafields.reduce(
      (acc:any, { node }: { node: { key: string; value: string } }) => {
        if (node.key === "threshold") {
          acc.threshold = parseFloat(node.value) || defaultSettings.threshold;
        } else if (node.key === "fixed_charge") {
          acc.fixedCharge = parseFloat(node.value) || defaultSettings.fixedCharge;
        } else if (node.key === "percentage_charge") {
          acc.percentageCharge = parseFloat(node.value) || defaultSettings.percentageCharge;
        }
        return acc;
      },
      { ...defaultSettings }
    );

    return json({ settings, shopId });
  } catch (error) {
    console.error("Loader error:", error);
    return json(
      {
        settings: { threshold: 500, fixedCharge: 15, percentageCharge: 4 },
        shopId: "",
        error: "Failed to load settings",
      },
      { status: 500 }
    );
  }
};

// Action function - creates/updates metafields
export const action = async ({ request }: ActionFunctionArgs): Promise<ReturnType<typeof json<ActionData>>> => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const threshold = parseFloat(formData.get("threshold") as string);
  const fixedCharge = parseFloat(formData.get("fixedCharge") as string);
  const percentageCharge = parseFloat(formData.get("percentageCharge") as string);

  // Validate inputs
  const errors: { field: string; message: string }[] = [];
  if (isNaN(threshold) || threshold < 0) {
    errors.push({ field: "threshold", message: "Threshold must be a valid non-negative number" });
  }
  if (isNaN(fixedCharge) || fixedCharge < 0) {
    errors.push({ field: "fixedCharge", message: "Fixed charge must be a valid non-negative number" });
  }
  if (isNaN(percentageCharge) || percentageCharge < 0) {
    errors.push({ field: "percentageCharge", message: "Percentage charge must be a valid non-negative number" });
  }

  if (errors.length > 0) {
    return json({ success: false, errors }, { status: 400 });
  }

  try {
    // Fetch shop ID
    const shopResponse = await admin.graphql(
      `#graphql
      query getShopId {
        shop {
          id
        }
      }`
    );
    const shopResponseJson = await shopResponse.json();
    const shopId = shopResponseJson.data.shop.id;

    // Prepare metafields
    const metafields = [
      {
        key: "threshold",
        value: threshold.toString(),
        namespace: "shipping_settings",
        type: "number_decimal",
        ownerId: shopId,
      },
      {
        key: "fixed_charge",
        value: fixedCharge.toString(),
        namespace: "shipping_settings",
        type: "number_decimal",
        ownerId: shopId,
      },
      {
        key: "percentage_charge",
        value: percentageCharge.toString(),
        namespace: "shipping_settings",
        type: "number_decimal",
        ownerId: shopId,
      },
    ];

    // Execute mutation
    const response = await admin.graphql(
      `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: { metafields },
      }
    );

    const responseJson = await response.json();
    const { metafieldsSet } = responseJson.data;

    if (metafieldsSet.userErrors.length > 0) {
      return json({ success: false, errors: metafieldsSet.userErrors }, { status: 400 });
    }

    return json({ success: true, message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, errors: [{ field: "", message: "Failed to save settings" }] }, { status: 500 });
  }
};

// React component
export default function SettingsPage() {
  const { settings, error: loaderError } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    threshold: settings.threshold.toString(),
    fixedCharge: settings.fixedCharge.toString(),
    percentageCharge: settings.percentageCharge.toString(),
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  // Handle toast display based on actionData
  useEffect(() => {
    if (actionData) {
      setToastMessage(
        actionData.success
          ? actionData.message || "Settings saved successfully!"
          : actionData.errors?.[0]?.message || "Error saving settings"
      );
      setToastError(!actionData.success);
      setShowToast(true);
    }
  }, [actionData]);

  const handleSubmit = useCallback(() => {
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("threshold", formData.threshold);
    formDataToSubmit.append("fixedCharge", formData.fixedCharge);
    formDataToSubmit.append("percentageCharge", formData.percentageCharge);

    submit(formDataToSubmit, { method: "post" });
  }, [formData, submit]);

  const handleChange = useCallback((field: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toastMarkup = showToast ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setShowToast(false)}
      error={toastError}
    />
  ) : null;

  return (
    <Frame>
      <Page>
        <TitleBar title="Settings page" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Shipping Settings
                </Text>
                {loaderError && (
                  <Text as="p" tone="critical">
                    {loaderError}
                  </Text>
                )}
                <Form onSubmit={handleSubmit}>
                  <FormLayout>
                    <TextField
                      label="Threshold Amount"
                      type="number"
                      value={formData.threshold}
                      onChange={handleChange("threshold")}
                      prefix="$"
                      helpText="Minimum order amount for shipping calculations"
                      error={actionData?.errors?.find((e) => e.field === "threshold")?.message}
                      autoComplete="off"
                    />
                    <TextField
                      label="Fixed Charge"
                      type="number"
                      value={formData.fixedCharge}
                      onChange={handleChange("fixedCharge")}
                      prefix="$"
                      helpText="Base shipping charge"
                      error={actionData?.errors?.find((e) => e.field === "fixed_charge")?.message}
                      autoComplete="off"
                    />
                    <TextField
                      label="Percentage Charge"
                      type="number"
                      value={formData.percentageCharge}
                      onChange={handleChange("percentageCharge")}
                      suffix="%"
                      helpText="Additional percentage charge on order total"
                      error={actionData?.errors?.find((e) => e.field === "percentage_charge")?.message}
                      autoComplete="off"
                    />
                    <Button
                      submit
                      loading={navigation.state === "submitting"}
                      accessibilityLabel="Save shipping settings"
                    >
                      Save Settings
                    </Button>
                  </FormLayout>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}