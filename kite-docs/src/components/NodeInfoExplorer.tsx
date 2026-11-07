import { useEffect, useState } from "react";
import JsonSchemaExplorer from "./JsonSchemaExplorer";
import { cn } from "../lib/util";
import type { JsonSchema7Type } from "zod-to-json-schema";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

type NodeInfo = {
  title: string;
  description: string;
  color: string;
  dataSchema: JsonSchema7Type | null;
  resultSchema: JsonSchema7Type | null;
  dataFields: string[];
  creditsCost: number | null;
};

/**
 * Show the value sent to Discord as an integer in the docs. The editor still
 * stores numeric text or a placeholder, which the service converts to seconds.
 * This changes only the viewer, not the saved flow's input schema.
 */
function schemaForDocs(
  schema: JsonSchema7Type,
  type: string,
  tab: "data" | "result"
): JsonSchema7Type {
  if (
    type !== "action_member_ban" ||
    tab !== "data" ||
    typeof schema !== "object"
  ) {
    return schema;
  }

  const properties = (
    schema as { properties?: Record<string, JsonSchema7Type> }
  ).properties;
  const field = properties?.member_ban_delete_message_duration_seconds;
  if (!field || typeof field !== "object") return schema;

  return {
    ...schema,
    properties: {
      ...properties,
      member_ban_delete_message_duration_seconds: {
        ...field,
        anyOf: undefined,
        type: "integer",
        description:
          (field.description ?? "") +
          " Enter a number or a {{ }} expression; Kite sends an integer to Discord.",
      },
    },
  };
}

export default function NodeInfoExplorer({ type }: { type: string }) {
  const [tab, setTab] = useState<"data" | "result">("result");
  const [data, setData] = useState<NodeInfo | null>(null);

  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();

  useEffect(() => {
    const abortController = new AbortController();

    fetch(`${customFields.appBaseUrl}/api/flow/nodes/${type}`, {
      signal: abortController.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data", data);
        setData(data);
      })
      .catch((error) => {
        // Only log errors that aren't from cancellation
        if (error.name !== "AbortError") {
          console.error("Failed to fetch node info:", error);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [type]);

  useEffect(() => {
    if (data?.resultSchema) {
      setTab("result");
    } else if (data?.dataSchema) {
      setTab("data");
    }
  }, [data]);

  if (!data) {
    return <div>Loading...</div>;
  }

  const schema = tab === "data" ? data.dataSchema : data.resultSchema;
  const displaySchema = schema && schemaForDocs(schema, type, tab);

  return (
    <div>
      <div className="flex border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg mb-3">
        {data.resultSchema && (
          <div
            className={cn(
              "flex-1 px-3 py-1.5 font-bold rounded-md cursor-pointer transition-colors",
              tab === "result" && "bg-white dark:bg-zinc-700"
            )}
            role="button"
            onClick={() => setTab("result")}
          >
            Result Data
          </div>
        )}
        {data.dataSchema && (
          <div
            className={cn(
              "flex-1 px-3 py-1.5 font-bold rounded-md cursor-pointer transition-colors",
              tab === "data" && "bg-white dark:bg-zinc-700"
            )}
            role="button"
            onClick={() => setTab("data")}
          >
            Input Data
          </div>
        )}
      </div>

      <div className="bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-lg">
        {displaySchema && <JsonSchemaExplorer schema={displaySchema} />}
      </div>
    </div>
  );
}
