@file:OptIn(ExperimentalJsExport::class)

package io.github.kartollikaa.shapestudio.engine

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@JsExport
fun version(): String = buildJsonObject {
    put("engine", ENGINE_VERSION)
    put("graphicsShapes", GRAPHICS_SHAPES_VERSION)
}.toString()
