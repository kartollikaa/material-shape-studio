import { track, trackPageView } from "./analytics";
import { mountConnect } from "./connect-page";

trackPageView(track, document);
mountConnect(document, track);
