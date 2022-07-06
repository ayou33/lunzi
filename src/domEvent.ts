import useEvent from "./event";

function supoprtDomEvent (dom: Element) {
  return useEvent(
    (event, handler, options) => dom.addEventListener(event, handler, options),
    (event, handler, options) => dom.removeEventListener(event, handler, options),
  )
}

export default supoprtDomEvent
