import React from "react";
import VehicleFormScreen from "./v2/VehicleFormScreen";

/** @deprecated Kept as a compatibility route for the legacy navigator. */
export default function AddVehicleScreen(props: any) {
    const Component = VehicleFormScreen as React.ComponentType<any>;
    return <Component {...props} route={props.route ?? { params: undefined }} />;
}
