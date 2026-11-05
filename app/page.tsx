import HomeClient from './components/HomeClient';
import { parseFocus } from './lib/focus';

type HomeProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function Home({ searchParams }: HomeProps) {
  return (
    <>
      <h1 className="sr-only">Manda Pixel: 1 milhão de pixels a R$ 1 cada</h1>
      <HomeClient focus={parseFocus(searchParams.x, searchParams.y)} />
    </>
  );
}
