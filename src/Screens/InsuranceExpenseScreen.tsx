import React from "react";
import ExpenseFormScreen from "./v2/ExpenseFormScreen";

/** @deprecated Use ExpenseFormScreen with category=insurance. */
export function InsuranceExpenseScreen(props: any) {
    const Component = ExpenseFormScreen as React.ComponentType<any>;
    return <Component {...props} route={{ ...(props.route ?? {}), params: { ...(props.route?.params ?? {}), category: "insurance" } }} />;
}
