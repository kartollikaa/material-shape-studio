import "./styles.css";
import { track, trackPageView } from "./analytics";
import { mountStudio } from "./studio/page";

trackPageView(track, document);
mountStudio(document, track);
