import { useContext } from "react"
import { ProfileContext } from "../providers/ProfileDataProvider"


export function GasStationsScreen(){
    const {gasStations} = useContext(ProfileContext);

    console.log(gasStations);
    
    return <></>
}