// Free the graphics-card memory of 3D objects we're throwing away.
// Shapes (geometries) are always freed (if one turns out to still be in use
// somewhere, it's simply uploaded again). Materials are only freed when the
// object owns its own copy (userData.ownMat), because shared materials are
// expensive to rebuild.
export function disposeTree(root) {
  root?.traverse((o) => {
    o.geometry?.dispose();
    if (o.userData.ownMat) for (const m of [].concat(o.material || [])) m.dispose();
  });
}

// Remove all children of a group and free them.
export function clearAndDispose(group) {
  for (const c of [...group.children]) disposeTree(c);
  group.clear();
}
