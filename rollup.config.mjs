import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import nodeExternals from 'rollup-plugin-node-externals';

export default {
  input: './src/main.ts',
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts', '.tsx', '.jsx']
    }),
    nodeExternals(),
    commonjs(),
    typescript()
  ],
  output: {
    format: 'commonjs',
    file: './dist/limit.js'
  }
};
