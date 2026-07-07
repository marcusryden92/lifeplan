"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { Loader } from "@/components/ui/Loader";
import { overlay, overlayHidden, logo } from "./AppLoadingScreen.css";

const SPOKE_COUNT = 40;
const SPOKE_STEP = 360 / SPOKE_COUNT;
const spokeAngles = Array.from(
  { length: SPOKE_COUNT },
  (_, i) => i * SPOKE_STEP,
);

// isLoaded flips true only once the session has resolved (the fetch is gated on
// userId) and the initial calendar snapshot has hydrated Redux, so it is the
// single "everything is loaded" signal for the whole app shell.
export function AppLoadingScreen() {
  const isLoaded = useSelector(
    (state: RootState) => state.calendarSource.isLoaded,
  );

  // If Redux was retained from a prior navigation, skip straight to gone so
  // there is no flash of the overlay on a warm remount.
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">(() =>
    isLoaded ? "gone" : "visible",
  );

  useEffect(() => {
    if (phase === "visible" && isLoaded) setPhase("fading");
  }, [phase, isLoaded]);

  if (phase === "gone") return null;

  return (
    <div
      className={`${overlay} ${phase === "fading" ? overlayHidden : ""}`}
      role="status"
      aria-busy="true"
      aria-label="Loading Circadium"
      aria-hidden={phase === "fading"}
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity" && phase === "fading") {
          setPhase("gone");
        }
      }}
    >
      <svg
        className={logo}
        viewBox="0 0 744 744"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* All center-mark subpaths merged into one fill so the two mirrored
            halves share the x=372 seam as interior, not two separately
            anti-aliased edges (which left a hairline gap along the lip). */}
        <path
          d="M195 235C133 248 80 298 80 298L79 304C92 297 153 249 223 248C278 247 335 292 347 366C347 366 351 408 351 420C351 433 345 461 345 461C345 461 355 478 372 478V474C356 473 360 461 360 461C366 417 360 356 360 356C357 307 308 263 308 263C308 263 256 222 195 235Z M332 445C332 445 313 455 313 474C314 493 332 492 332 492C332 492 324 485 327 480C350 460 356 500 372 500V508C364 508 354 503 351 500C350 498 349 494 348 491C346 488 343 485 339 484C331 482 332 492 332 492L347 493L346 497H328C328 497 300 498 301 474C301 450 331 442 331 442L332 445Z M356 531C356 531 356 518 359 508L363 509C363 509 362 522 362 531C362 531 365 536 372 536V562C369 562 365 559 363 559C362 558 357 554 345 554C333 553 329 558 319 559C310 559 296 558 289 557C282 556 286 550 289 550C292 549 304 550 323 541C342 531 356 531 356 531Z M372 604C347 604 323 619 323 619L327 629C327 629 347 616 372 616V604Z M372 579C360 579 361 580 341 578C321 577 310 560 289 559C309 569 316 582 330 586C345 590 362 592 372 592V579Z M320 350C295 188 122 311 122 311L130 320C130 320 290 224 315 357L320 350Z M280 317C240 272 171 318 171 318C171 318 200 350 229 354C259 358 280 345 305 355L307 353C273 338 260 352 234 346C208 339 185 320 185 320C214 304 244 303 266 320C288 338 280 330 308 353L312 352C312 352 305 348 280 317Z M550 235C611 248 664 298 664 298L665 304C652 297 591 249 521 248C466 247 409 292 398 366C398 366 393 408 393 420C393 433 400 461 400 461C400 461 390 478 372 478V474C388 473 385 461 385 461C378 417 385 356 385 356C387 307 436 263 436 263C436 263 488 222 550 235Z M412 445C412 445 432 455 431 474C431 493 412 492 412 492C412 492 420 485 418 480C394 460 388 500 372 500V508C381 508 390 503 393 500C394 498 395 494 397 491C398 488 401 485 406 484C414 482 412 492 412 492L398 493L398 497H417C417 497 444 498 444 474C443 450 413 442 413 442L412 445Z M388 531C388 531 388 518 386 508L381 509C381 509 383 522 383 531C383 531 380 536 372 536V562C376 562 380 559 381 559C383 558 388 554 400 554C412 553 416 558 425 559C435 559 449 558 456 557C463 556 459 550 456 550C453 549 441 550 422 541C403 531 388 531 388 531Z M372 604C398 604 422 619 422 619L418 629C418 629 398 616 372 616V604Z M372 579C385 579 383 580 403 578C423 577 435 560 455 559C436 569 429 582 414 586C400 590 382 592 372 592V579Z M424 350C450 188 623 311 623 311L615 320C615 320 454 224 429 357L424 350Z M465 317C505 272 574 318 574 318C574 318 545 350 515 354C486 358 465 345 440 355L437 353C471 338 484 352 510 346C536 339 560 320 560 320C531 304 500 303 478 320C456 338 464 330 437 353L433 352C433 352 440 348 465 317Z"
          fill="currentColor"
        />
        <defs>
          <g id="app-loading-spoke-outer">
            <path
              d="M372 26L372 69"
              stroke="currentColor"
              strokeWidth={10}
            />
          </g>
          <g id="app-loading-spoke-inner">
            <path
              d="M345 27L348 70"
              stroke="currentColor"
              strokeWidth={10}
            />
          </g>
        </defs>
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 372 372"
            to="360 372 372"
            dur="10s"
            repeatCount="indefinite"
          />
          <path
            d="M370.793 67.0426C538.687 67.0426 674.793 203.148 674.793 371.043C674.793 538.937 538.687 675.043 370.793 675.043C202.898 675.043 66.7927 538.937 66.7927 371.043C66.7927 203.148 202.898 67.0426 370.793 67.0426Z"
            stroke="currentColor"
            strokeWidth={8}
          />
          <path
            d="M371.793 19.5426C566.473 19.5426 724.293 177.362 724.293 372.043C724.293 566.723 566.473 724.543 371.793 724.543C177.112 724.543 19.2927 566.723 19.2927 372.043C19.2927 177.362 177.112 19.5426 371.793 19.5426Z"
            stroke="currentColor"
            strokeWidth={15}
          />
          {spokeAngles.map((deg) => (
            <use
              key={`outer-${deg}`}
              href="#app-loading-spoke-outer"
              transform={`rotate(${deg} 372 372)`}
            />
          ))}
          {spokeAngles.map((deg) => (
            <use
              key={`inner-${deg}`}
              href="#app-loading-spoke-inner"
              transform={`rotate(${deg} 372 372)`}
            />
          ))}
        </g>
      </svg>

      <Loader size="lg" label="Loading Circadium" />
    </div>
  );
}
