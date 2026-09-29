@file:OptIn(ExperimentalJsExport::class)

package io.github.kartollikaa.shapestudio.engine

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.khronos.webgl.Float32Array

@JsExport
fun version(): String = buildJsonObject {
    put("engine", ENGINE_VERSION)
    put("graphicsShapes", GRAPHICS_SHAPES_VERSION)
}.toString()

@JsExport
fun build(doc: String): String = ShapeEngine.build(doc).toJson()

// Kotlin/JS represents FloatArray as a Float32Array, so this hands the array over without copying.
@JsExport
fun buildCubics(doc: String): Float32Array = ShapeEngine.build(doc).cubics.unsafeCast<Float32Array>()
