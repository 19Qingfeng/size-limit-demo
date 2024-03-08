import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: './src/index.ts',
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts', '.tsx', '.jsx']
    }),
    commonjs(),
    typescript()
  ],
  output: {
    format: 'iife',
    name: 'library',
    file: './dist/library.js'
  }
};
