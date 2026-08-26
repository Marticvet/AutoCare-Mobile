import React from "react";
import ExpenseFormScreen from "./v2/ExpenseFormScreen";

/** @deprecated Use ExpenseFormScreen with category=service. */
export default function ServiceExpenseScreen(props: any) {
    const Component = ExpenseFormScreen as React.ComponentType<any>;
    return <Component {...props} route={{ ...(props.route ?? {}), params: { ...(props.route?.params ?? {}), category: "service" } }} />;
}
