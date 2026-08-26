import React, { PropsWithChildren } from "react";

/** @deprecated The app now uses an accessible bottom-tab + native-stack layout. */
export default function SidebarNavigator({ children }: PropsWithChildren) {
    return <>{children}</>;
}
