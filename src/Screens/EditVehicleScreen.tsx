import React from "react";
import VehicleFormScreen from "./v2/VehicleFormScreen";

/** @deprecated Use VehicleFormScreen. */
export default function EditVehicleScreen(props: any) {
    const Component = VehicleFormScreen as React.ComponentType<any>;
    return <Component {...props} route={{ ...(props.route ?? {}), params: { vehicleId: props.route?.params?.vehicle?.id ?? props.route?.params?.vehicleId } }} />;
}
