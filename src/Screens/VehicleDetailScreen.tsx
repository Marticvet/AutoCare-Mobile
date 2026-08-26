import React from "react";
import VehicleDetailScreenV2 from "./v2/VehicleDetailScreen";

/** @deprecated Use the typed v2 vehicle detail route. */
export default function VehicleDetailScreen(props: any) {
    const Component = VehicleDetailScreenV2 as React.ComponentType<any>;
    return <Component {...props} route={{ ...(props.route ?? {}), params: { vehicleId: props.route?.params?.vehicleId ?? props.route?.params?.vehicle?.id ?? "" } }} />;
}
