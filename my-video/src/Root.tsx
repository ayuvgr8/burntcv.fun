import "./index.css";
import { Composition } from "remotion";
import { OpenSlotFilm } from "./openslot/OpenSlotFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OpenSlot"
        component={OpenSlotFilm}
        durationInFrames={2010}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
