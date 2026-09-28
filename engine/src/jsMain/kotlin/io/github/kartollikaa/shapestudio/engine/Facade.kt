@file:OptIn(ExperimentalJsExport::class)

package io.github.kartollikaa.shapestudio.engine

import io.github.kartollikaa.shapestudio.engine.document.reject
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

private val morphs = mutableMapOf<Int, ShapeMorph>()
private var nextMorphHandle = 1

@JsExport
fun createMorph(startDoc: String, endDoc: String): Int {
    val morph = ShapeEngine.morph(startDoc, endDoc)
    return nextMorphHandle++.also { morphs[it] = morph }
}

@JsExport
fun morphCubics(handle: Int, progress: Float): Float32Array = morphFor(handle).cubics(progress).unsafeCast<Float32Array>()

@JsExport
fun morphBounds(handle: Int): Float32Array = morphFor(handle).maxBounds().unsafeCast<Float32Array>()

@JsExport
fun releaseMorph(handle: Int) {
    morphs.remove(handle)
}

private fun morphFor(handle: Int): ShapeMorph = morphs[handle] ?: reject("handle", "morph $handle is unknown or was released")
